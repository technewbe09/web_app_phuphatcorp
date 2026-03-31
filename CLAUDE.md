# PhuPhatCorp Accounting Web App

## Project Overview

Hệ thống web hỗ trợ công ty PhuPhatCorp xử lý số liệu kế toán.
**Stack:** ReactJS + NodeJS + PostgreSQL + JWT

## Project Structure

```
web_v2/
├── backend/                    # NodeJS + Express + TypeScript
│   ├── src/
│   │   ├── config/             # database.ts, env.ts
│   │   ├── controllers/         # authController.ts
│   │   ├── middleware/         # auth.ts, errorHandler.ts, validate.ts
│   │   ├── routes/             # auth.ts, users.ts, index.ts
│   │   ├── services/           # authService.ts
│   │   ├── types/              # user.ts, api.ts
│   │   ├── utils/              # jwt.ts, password.ts, response.ts
│   │   ├── migrations/         # SQL migrations
│   │   ├── scripts/            # Dev scripts (create-admin.ts)
│   │   ├── app.ts
│   │   └── server.ts
│   └── .env
│
└── frontend/                   # ReactJS + Vite + TypeScript
    ├── src/
    │   ├── api/               # axiosClient.ts, authApi.ts
    │   ├── components/        # ui/ (Button, Input, Card, Table, Modal...)
    │   ├── contexts/           # AuthContext.tsx
    │   ├── hooks/              # useAuth.ts, useApi.ts
    │   ├── layouts/           # MainLayout.tsx, AuthLayout.tsx
    │   ├── pages/             # auth/, dashboard/, placeholder pages
    │   ├── stores/            # authStore.ts (Zustand)
    │   ├── types/             # user.ts, api.ts
    │   ├── utils/            # cn.ts, format.ts
    │   ├── App.tsx
    │   └── Router.tsx
    └── .env
```

## Environment

### Backend (.env)
```
PORT=3021
DB_HOST=72.61.124.36
DB_PORT=5443
DB_NAME=test_PhuPhatCorp
DB_USER=postgres
DB_PASSWORD=<secret>
DB_SSL=false
JWT_SECRET=<secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3021/api
```

## Database

- **Host:** 72.61.124.36:5443
- **Database:** test_PhuPhatCorp
- **Migrations:** `backend/src/migrations/001_create_users.sql`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Đăng ký user mới |
| POST | /api/auth/login | No | Đăng nhập, trả `{ user, accessToken }` |
| POST | /api/auth/refresh | Cookie | Refresh access token |
| POST | /api/auth/logout | No | Clear refresh cookie |
| GET | /api/auth/me | JWT | Lấy thông tin user hiện tại |

**Backend response format:** `{ success: boolean, message: string, data: T }`

## Authentication

- **JWT access token:** 15 phút, gửi trong body response
- **Refresh token:** 7 ngày, lưu trong httpOnly cookie
- **Roles:** ADMIN, ACCOUNTANT, VIEWER
- **Admin account:** `admin@phuphatcorp.com` / `Admin@123456`

## Frontend Routes

| Path | Auth | Component |
|------|------|-----------|
| /login | Public | LoginPage |
| /register | Public | RegisterPage |
| / | Protected | DashboardPage |
| /accounting | Protected | Placeholder |
| /reports | Protected | Placeholder |
| /settings | Protected | Placeholder |

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Tạo admin user
cd backend && npx tsx src/scripts/create-admin.ts
```

## Key Conventions

- **API response:** Backend luôn wrap response trong `{ success, message, data }`
- **Router:** Dùng `BrowserRouter` + JSX routes (KHÔNG dùng `createBrowserRouter` vì gây lỗi context với AuthProvider)
- **AuthProvider:** Phải nằm bên trong `BrowserRouter`, navigation xử lý tại page level (KHÔNG trong AuthProvider)
- **Files:** camelCase (functions, vars), PascalCase (components), snake_case (DB tables/columns)
- **Security:** Không log password, không trả password_hash, .env không commit git

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | ReactJS, Vite, TypeScript, Tailwind CSS v3 |
| Backend | NodeJS, Express, TypeScript |
| Database | PostgreSQL (pg driver) |
| Auth | JWT + bcryptjs + httpOnly cookie |
| State | Zustand, React Context |
| Forms | React Hook Form + Yup |
| HTTP | Axios + interceptors |
| Query | TanStack Query |
| Icons | Lucide React |
