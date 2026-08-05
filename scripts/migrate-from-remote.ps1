# Migrates Postgres + MinIO data from remote (backend/.env) into local Docker.
# Prerequisites: docker compose up -d, pg_dump/psql on PATH (or PostgreSQL 17 installed).
#
# Usage (from repo root):
#   .\scripts\migrate-from-remote.ps1
#   .\scripts\migrate-from-remote.ps1 -SkipMinio
#   .\scripts\migrate-from-remote.ps1 -SkipPostgres

param(
  [switch]$SkipPostgres,
  [switch]$SkipMinio,
  [switch]$UpdateEnv,
  [string]$EnvFile = "backend\.env",
  [string]$DumpDir = ".docker-migrate"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $map[$key] = $val
  }
  return $map
}

function Find-PgTool {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "C:\Program Files\PostgreSQL\17\bin\$Name.exe",
    "C:\Program Files\PostgreSQL\16\bin\$Name.exe",
    "C:\Program Files\PostgreSQL\15\bin\$Name.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  throw "Could not find $Name. Install PostgreSQL client tools or add them to PATH."
}

if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

$envMap = Read-DotEnv $EnvFile
New-Item -ItemType Directory -Force -Path $DumpDir | Out-Null

# Local Docker targets (must match docker-compose.yml)
$LocalDbHost = "127.0.0.1"
$LocalDbPort = "5433"
$LocalDbName = "phuphatcorp_dev"
$LocalDbUser = "phuphat"
$LocalDbPass = "phuphat_dev"
$LocalMinioEndpoint = "http://host.docker.internal:9000"
$LocalMinioUser = "minioadmin"
$LocalMinioPass = "minioadmin"
$Bucket = if ($envMap["MINIO_BUCKET"]) { $envMap["MINIO_BUCKET"] } else { "phuphatcorp-inspections-staging" }

Write-Host "==> Ensuring Docker services are up..."
docker compose up -d postgres minio
docker compose run --rm minio-init | Out-Host

if (-not $SkipPostgres) {
  $pgDump = Find-PgTool "pg_dump"
  $psql = Find-PgTool "psql"
  $dumpFile = Join-Path $DumpDir "postgres.dump"

  $remoteHost = $envMap["DB_HOST"]
  $remotePort = $envMap["DB_PORT"]
  $remoteDb = $envMap["DB_NAME"]
  $remoteUser = $envMap["DB_USER"]
  $remotePass = $envMap["DB_PASSWORD"]

  Write-Host "==> Dumping remote Postgres $remoteHost`:$remotePort/$remoteDb ..."
  $env:PGPASSWORD = $remotePass
  & $pgDump -h $remoteHost -p $remotePort -U $remoteUser -d $remoteDb `
    -Fc --no-owner --no-acl -f $dumpFile
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }

  Write-Host "==> Waiting for local Postgres..."
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    $env:PGPASSWORD = $LocalDbPass
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $psql -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d $LocalDbName -c "SELECT 1" 2>$null | Out-Null
    $exit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    if ($exit -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) { throw "Local Postgres did not become ready on ${LocalDbHost}:${LocalDbPort}." }

  Write-Host "==> Dropping & recreating local database (clean restore)..."
  $env:PGPASSWORD = $LocalDbPass
  & $psql -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d postgres -v ON_ERROR_STOP=1 -c `
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LocalDbName' AND pid <> pg_backend_pid();"
  & $psql -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d postgres -v ON_ERROR_STOP=1 -c `
    "DROP DATABASE IF EXISTS $LocalDbName;"
  & $psql -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d postgres -v ON_ERROR_STOP=1 -c `
    "CREATE DATABASE $LocalDbName OWNER $LocalDbUser;"

  Write-Host "==> Restoring dump into local Postgres..."
  $pgRestore = Find-PgTool "pg_restore"
  & $pgRestore -h $LocalDbHost -p $LocalDbPort -U $LocalDbUser -d $LocalDbName `
    --no-owner --no-acl --verbose $dumpFile
  # pg_restore returns 1 when some warnings occur; treat only hard failure as error
  if ($LASTEXITCODE -gt 1) { throw "pg_restore failed with exit code $LASTEXITCODE" }

  Write-Host "==> Postgres migration done."
}

if (-not $SkipMinio) {
  $remoteEndpoint = $envMap["MINIO_ENDPOINT"]
  $remotePort = $envMap["MINIO_PORT"]
  $useSsl = $envMap["MINIO_USE_SSL"] -eq "true"
  $scheme = if ($useSsl) { "https" } else { "http" }
  # Port 443/80 usually omitted in public URL; include otherwise
  $remoteUrl = if (($useSsl -and $remotePort -eq "443") -or (-not $useSsl -and $remotePort -eq "80")) {
    "$scheme`://$remoteEndpoint"
  } else {
    "$scheme`://$remoteEndpoint`:$remotePort"
  }
  $remoteUser = $envMap["MINIO_ACCESS_KEY"]
  $remotePass = $envMap["MINIO_SECRET_KEY"]

  Write-Host "==> Mirroring MinIO bucket '$Bucket' from $remoteUrl -> local..."

  # minio/mc image ENTRYPOINT is already `mc` — override entrypoint; avoid CRLF in -c scripts on Windows
  $mcArgs = @(
    "run", "--rm",
    "--entrypoint", "/bin/sh",
    "--add-host=host.docker.internal:host-gateway",
    "minio/mc:latest",
    "-c",
    "mc alias set remote '$remoteUrl' '$remoteUser' '$remotePass' && mc alias set local '$LocalMinioEndpoint' '$LocalMinioUser' '$LocalMinioPass' && mc mb --ignore-existing local/$Bucket && mc mirror --overwrite remote/$Bucket local/$Bucket && mc ls --recursive local/$Bucket | head -n 20 && echo MinIO_mirror_complete"
  )
  & docker @mcArgs
  if ($LASTEXITCODE -ne 0) { throw "MinIO mirror failed with exit code $LASTEXITCODE" }
  Write-Host "==> MinIO migration done."
}

if ($UpdateEnv) {
  $backup = "$EnvFile.remote.bak"
  if (-not (Test-Path $backup)) {
    Copy-Item $EnvFile $backup
    Write-Host "==> Backed up remote env to $backup"
  }
  $example = Join-Path $RepoRoot ".env.docker.example"
  # Preserve JWT_SECRET from current env if present
  $jwt = $envMap["JWT_SECRET"]
  $content = Get-Content $example -Raw
  if ($jwt) {
    $content = $content -replace 'JWT_SECRET=change-me-for-local-dev', "JWT_SECRET=`"$jwt`""
  }
  Set-Content -Path $EnvFile -Value $content -NoNewline
  Write-Host "==> Updated $EnvFile to point at local Docker"
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Ensure backend/.env points at localhost (use -UpdateEnv or copy .env.docker.example)"
Write-Host "  2. Restart backend: cd backend && npm run dev"
Write-Host "  3. MinIO console: http://localhost:9001 (minioadmin / minioadmin)"
Write-Host "  4. Dump file kept at: $DumpDir (safe to delete)"
