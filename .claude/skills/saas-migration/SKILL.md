---
name: saas-migration
description: Workflow quy hoạch và chuyển đổi kiến trúc từ single-tenant sang SaaS
  multi-tenant cho HostaraX. Invoke khi cần quy hoạch kiến trúc SaaS, thiết kế
  multi-tenancy, hoặc implement từng milestone của quá trình chuyển đổi.
  Workflow chia 2 giai đoạn rõ ràng — QUY HOẠCH (Phase 1-4) tạo blueprint đầy đủ,
  sau đó IMPLEMENT (Phase 5+) theo từng milestone.
disable-model-invocation: true
---

# Workflow: SaaS Migration
# PhuPhatCorp Web — Quy hoạch toàn bộ → Implement từng milestone

## Tổng quan

```
User yêu cầu chuyển đổi SaaS
            ↓
━━━━━ GIAI ĐOẠN 1: QUY HOẠCH ━━━━━
            ↓
[PHASE 1] Current State Audit     → hiểu rõ hiện trạng, dependencies
            ↓ ✋ dừng confirm
[PHASE 2] Target Architecture     → thiết kế kiến trúc SaaS đích
            ↓ ✋ dừng confirm
[PHASE 3] Migration Plan          → chia milestone, đánh giá risk
            ↓ ✋ dừng confirm
[PHASE 4] Blueprint Document      → tài liệu đầy đủ, lưu docs/
            ↓ tự động
         Giao blueprint cho user review
            ↓
━━━━━ GIAI ĐOẠN 2: IMPLEMENT ━━━━━
            ↓
[PHASE 5] Implement Milestone X   → gọi feature-dev hoặc change-request per milestone
            ↓ ✋ dừng confirm sau mỗi milestone
[PHASE 6] Migration Verify        → test cross-tenant isolation, regression
            ↓ tự động
         Báo cáo milestone hoàn tất → quay lại Phase 5 cho milestone tiếp
```

**Giai đoạn 1:** Dừng 3 lần (Phase 1, 2, 3) — mỗi lần để user confirm hướng đi.
**Giai đoạn 2:** Dừng sau mỗi milestone — không implement nhiều milestone liên tục.
**Nguyên tắc:** Quy hoạch xong 100% mới bắt đầu implement. Không vừa thiết kế vừa code.

---

## PHASE 1 — Current State Audit

### Mục tiêu
Hiểu rõ hiện trạng hệ thống trước khi thiết kế kiến trúc mới. Xác định mọi chỗ cần thay đổi.

### Thực hiện

**Bước 0 — Đọc toàn bộ knowledge base**
- `.claude/knowhow/know-how.md` → schema, endpoints, structure
- `.claude/knowhow/system-features.md` → business logic, flows
- `.claude/knowhow/decisions.md` → quyết định kiến trúc đã có
- `.claude/knowhow/lessons-learned.md` → vấn đề đã gặp
- `.claude/knowhow/coding_convention.md` → conventions đang dùng

**Bước 1 — Audit Database**

Liệt kê tất cả tables hiện tại và đánh giá:
```markdown
| Table | Rows ước tính | Cần tenant_id? | Shared data? | Migration risk |
|-------|--------------|----------------|--------------|----------------|
| users | ... | Có | Không | Medium |
| sku_factory_master | ... | Có | Không | High |
| refresh_tokens | ... | Có (qua user) | Không | Low |
| ... | | | | |
```

**Shared data** = data dùng chung cho tất cả tenants (ví dụ: danh mục tỉnh thành, factory list).
**Tenant-specific data** = data thuộc về 1 tenant (ví dụ: SKU của KH A).

**Bước 2 — Audit API Endpoints**

Liệt kê tất cả endpoints và đánh giá:
```markdown
| Endpoint | Cần filter tenant? | Hiện đã filter? | Breaking change? |
|----------|-------------------|-----------------|-----------------|
| GET /api/master-data/sku-factory | Có | Không | Không — thêm WHERE |
| POST /api/execute-data/process | Có | Không | Không |
| GET /api/admin/users | Có (per tenant) | Không | Có — scope thay đổi |
| ... | | | |
```

**Bước 3 — Audit Frontend**

Liệt kê pages/components cần thay đổi:
```markdown
| Page/Component | Thay đổi cần thiết |
|---------------|-------------------|
| Login | Thêm tenant selection hoặc subdomain routing |
| Dashboard | Filter data theo tenant |
| Admin Users | Scope theo tenant |
| ... | |
```

**Bước 4 — Audit Infrastructure**

```markdown
Hiện tại:
- Hosting: [VPS Hostinger — specs]
- Database: [PostgreSQL — 1 instance]
- Domain: [domain hiện tại]
- SSL: [có/không]

Cần thêm cho SaaS:
- Wildcard SSL cho subdomain
- DNS configuration
- Scaling strategy
```

**Bước 5 — Dependency Map**

Vẽ sơ đồ dependencies giữa các module:
```
Auth ← User Management ← SKU Master ← Execute Data
                                    ↑
                              (tất cả đều cần tenant context)
```

### Checkpoint 1 ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 PHASE 1 HOÀN TẤT — Current State Audit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tables cần tenant_id:    [X] / [tổng]
Endpoints cần filter:     [X] / [tổng]
Pages cần thay đổi:       [X] / [tổng]
Shared data tables:       [X]
Breaking changes dự kiến: [X]

Rủi ro cao nhất: [mô tả]

Bạn có muốn:
A) Tiếp tục — thiết kế Target Architecture
B) Bổ sung thông tin trước khi tiếp
C) Dừng tại đây
```

---

## PHASE 2 — Target Architecture

### Mục tiêu
Thiết kế kiến trúc SaaS đích với đầy đủ 4 pillars: multi-tenancy, subscription, custom domain, super admin portal.

### Thực hiện

**Pillar 1 — Multi-Tenancy (shared database, tenant_id)**

```markdown
### Tenant Model

**Table: tenants**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar | Tên công ty KH |
| slug | varchar | unique — dùng cho subdomain (vd: "acme") |
| custom_domain | varchar | nullable — domain riêng nếu có |
| status | enum | active, suspended, trial, cancelled |
| settings | jsonb | Cấu hình riêng per tenant |
| created_at | timestamp | |
| updated_at | timestamp | |

### Tenant Isolation Strategy
- Mọi table chứa tenant-specific data → thêm column `tenant_id UUID NOT NULL REFERENCES tenants(id)`
- Mọi query → thêm `WHERE tenant_id = $current_tenant_id`
- Middleware `tenantMiddleware` → resolve tenant từ subdomain/domain → attach `req.tenant`
- Row-Level Security (RLS) trên PostgreSQL như lớp bảo vệ thứ 2 (optional nhưng khuyến nghị)

### Tenant Resolution Flow
request → extract subdomain/domain → lookup tenants table → attach req.tenant
  ↓ không tìm thấy → 404 Tenant Not Found
  ↓ tenant suspended → 403 Tenant Suspended
  ↓ thành công → tiếp tục middleware chain

### Data Classification
| Loại | Tables | Có tenant_id? |
|------|--------|--------------|
| Tenant-specific | users, sku_factory_master, execute_data_* | Có |
| Shared/System | tenants, plans, system_config | Không |
| Linking | tenant_subscriptions | Có tenant_id |
```

**Pillar 2 — Subscription & Billing**

```markdown
### Plans

**Table: plans**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar | Free, Pro, Enterprise |
| price_monthly | numeric | |
| price_yearly | numeric | |
| max_users | integer | giới hạn per tenant |
| max_storage_mb | integer | |
| features | jsonb | feature flags per plan |
| is_active | boolean | |
| created_at | timestamp | |

**Table: tenant_subscriptions**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| plan_id | uuid | FK → plans |
| status | enum | active, past_due, cancelled, trial |
| trial_ends_at | timestamp | nullable |
| current_period_start | timestamp | |
| current_period_end | timestamp | |
| payment_provider | varchar | stripe, manual |
| provider_subscription_id | varchar | nullable |
| created_at | timestamp | |

### Feature Gating
- Middleware `planMiddleware(requiredFeature)` → check tenant's plan có feature đó không
- Feature flags lưu trong `plans.features` (jsonb): { "execute_data": true, "custom_domain": false }
- Vượt limit (max_users, max_storage) → trả 402 Payment Required
```

**Pillar 3 — Custom Domain / Subdomain**

```markdown
### Routing Strategy
- Mặc định: `{tenant_slug}.app.phuphatcorp.com`
- Custom domain: KH trỏ CNAME → `custom.app.phuphatcorp.com`
- Wildcard SSL: `*.app.phuphatcorp.com`

### Tenant Resolution Order
1. Check `Host` header against `tenants.custom_domain`
2. Extract subdomain, check against `tenants.slug`
3. Không match → landing page hoặc 404

### DNS & SSL
- Wildcard cert cho `*.app.phuphatcorp.com`
- Custom domain: Let's Encrypt per domain hoặc Cloudflare proxy
```

**Pillar 4 — Super Admin Portal**

```markdown
### Super Admin vs Tenant Admin
| Role | Scope | Mô tả |
|------|-------|-------|
| super_admin | Cross-tenant | Quản lý tất cả tenants, plans, billing |
| admin | 1 tenant | Quản lý users/data trong tenant mình |

### Super Admin Endpoints (riêng biệt)
- GET /api/super/tenants — danh sách tenants
- POST /api/super/tenants — tạo tenant mới
- PUT /api/super/tenants/:id — sửa tenant (status, plan, settings)
- GET /api/super/tenants/:id/stats — usage stats per tenant
- GET /api/super/dashboard — tổng quan (MRR, active tenants, churn)

### Super Admin UI
- Route riêng: `/super/*` hoặc subdomain `admin.app.phuphatcorp.com`
- Không share layout với tenant app
- Dashboard: số tenant active, MRR, signups, usage
```

**Tổng hợp — Schema mới**

Liệt kê tất cả tables mới cần tạo và tables cũ cần sửa:
```markdown
### Tables mới
- tenants
- plans
- tenant_subscriptions

### Tables sửa (thêm tenant_id)
- users → thêm tenant_id, index
- sku_factory_master → thêm tenant_id, index
- refresh_tokens → tenant qua user.tenant_id (không cần thêm trực tiếp)
- password_reset_tokens → tenant qua user.tenant_id

### Indexes cần thiết
- idx_users_tenant_id ON users(tenant_id)
- idx_sku_factory_tenant_id ON sku_factory_master(tenant_id)
- idx_tenants_slug ON tenants(slug) UNIQUE
- idx_tenants_custom_domain ON tenants(custom_domain) UNIQUE WHERE custom_domain IS NOT NULL
```

**Middleware Stack mới**

```
Request
  → tenantMiddleware (resolve tenant từ domain/subdomain)
  → authMiddleware (verify JWT, attach user)
  → tenantAccessMiddleware (verify user thuộc tenant này)
  → roleMiddleware (check role)
  → planMiddleware (check feature access) [optional per route]
  → controller
```

### Checkpoint 2 ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ PHASE 2 HOÀN TẤT — Target Architecture
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4 Pillars thiết kế:
  1. Multi-tenancy: shared DB + tenant_id + RLS
  2. Subscription: plans + tenant_subscriptions + feature gating
  3. Custom domain: subdomain default + CNAME custom
  4. Super Admin: cross-tenant management portal

Tables mới:    [X]
Tables sửa:    [X]
Middleware mới: [X]
Endpoints mới: [X]

Bạn có muốn:
A) Tiếp tục — lên Migration Plan (milestones)
B) Điều chỉnh kiến trúc
C) Dừng tại đây
```

---

## PHASE 3 — Migration Plan

### Mục tiêu
Chia quá trình chuyển đổi thành milestones có thể implement và deploy độc lập. Mỗi milestone kết thúc ở trạng thái app vẫn chạy được.

### Thực hiện

Thiết kế milestones theo nguyên tắc:
- Mỗi milestone deploy được độc lập — app không bị break giữa chừng
- Milestone sau xây trên milestone trước
- Ưu tiên: data isolation trước, features sau
- Backward compatible khi có thể

```markdown
### Migration Milestones

## M1 — Foundation: Tenant Model + Migration Infrastructure
**Mục tiêu:** Có bảng tenants, tạo default tenant cho data hiện tại
**Scope:**
- Tạo table `tenants`, `plans`
- Tạo default tenant (cho data hiện có)
- Tạo default plan (Free)
- Migration script thêm `tenant_id` vào tables hiện có
- Backfill tenant_id = default_tenant cho tất cả rows hiện có
**Kết quả:** App vẫn chạy bình thường, data đã có tenant_id
**Risk:** Medium — migration trên data production
**Dùng workflow:** change-request (LARGE)

---

## M2 — Tenant Isolation: Middleware + Query Filter
**Mục tiêu:** Mọi query đều filter theo tenant, data isolated
**Scope:**
- Implement `tenantMiddleware` (resolve từ subdomain)
- Sửa tất cả services: thêm tenant_id vào WHERE clauses
- Sửa tất cả controllers: truyền tenant context vào service
- Thêm tenant_id vào tất cả INSERT statements
- Index trên tenant_id columns
**Kết quả:** Tenant A không thấy data của Tenant B
**Risk:** High — touch mọi query, dễ miss 1 chỗ
**Dùng workflow:** change-request (LARGE) — chạy nhiều lần, per module

---

## M3 — Subscription & Plan Gating
**Mục tiêu:** Tenants có plan, features bị gate theo plan
**Scope:**
- Tạo table `tenant_subscriptions`
- Implement `planMiddleware`
- Thêm plan check vào routes cần gate
- API quản lý subscription (super admin)
- Trial logic
**Kết quả:** Tenant mới đăng ký nhận trial, hết hạn bị restrict
**Risk:** Medium
**Dùng workflow:** feature-dev

---

## M4 — Tenant Onboarding Flow
**Mục tiêu:** KH mới có thể tự đăng ký tenant
**Scope:**
- Sign-up flow: tạo tenant + admin user + assign plan
- Tenant setup wizard (tên công ty, cấu hình cơ bản)
- Welcome email
- Landing page / marketing page
**Kết quả:** KH vào domain → đăng ký → có app riêng
**Risk:** Low-Medium
**Dùng workflow:** feature-dev

---

## M5 — Custom Domain / Subdomain
**Mục tiêu:** Mỗi tenant có subdomain, option custom domain
**Scope:**
- Wildcard DNS + SSL setup
- Tenant resolution từ subdomain
- Custom domain CNAME verification
- SSL provisioning cho custom domain
**Kết quả:** acme.app.phuphatcorp.com hoạt động
**Risk:** Medium — infrastructure config
**Dùng workflow:** feature-dev + infrastructure task

---

## M6 — Super Admin Portal
**Mục tiêu:** Quản lý cross-tenant từ 1 dashboard
**Scope:**
- Super admin routes + middleware
- Tenant management CRUD
- Dashboard (MRR, active tenants, usage)
- Tenant impersonation (đăng nhập vào tenant để support)
**Kết quả:** Super admin quản lý toàn bộ tenants
**Risk:** Low — feature mới, không break existing
**Dùng workflow:** feature-dev
```

### Risk Assessment

```markdown
| Milestone | Risk | Lý do | Mitigation |
|-----------|------|-------|------------|
| M1 | Medium | Migration data production | Backup trước, migration idempotent, rollback script |
| M2 | High | Touch mọi query, miss = data leak | Audit checklist, automated test per endpoint |
| M3 | Medium | Billing logic phức tạp | Start simple (manual billing), add Stripe sau |
| M4 | Low-Med | Signup flow mới | Không ảnh hưởng existing tenants |
| M5 | Medium | Infrastructure | Test kỹ trên staging |
| M6 | Low | Feature mới, isolated | Không touch existing code |
```

### Timeline ước tính

```markdown
| Milestone | Effort | Dependencies |
|-----------|--------|-------------|
| M1 | 1-2 ngày | Không |
| M2 | 3-5 ngày | M1 |
| M3 | 2-3 ngày | M1 |
| M4 | 2-3 ngày | M1, M2 |
| M5 | 2-3 ngày | M2, M4 |
| M6 | 3-4 ngày | M1, M2, M3 |
```

### Checkpoint 3 ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 3 HOÀN TẤT — Migration Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tổng milestones: 6
Effort ước tính: 13-20 ngày
Critical path:   M1 → M2 → M4 → M5
Highest risk:    M2 (tenant isolation — touch mọi query)

Thứ tự khuyến nghị: M1 → M2 → M3 → M4 → M5 → M6

Bạn có muốn:
A) Tiếp tục — tạo Blueprint Document đầy đủ
B) Điều chỉnh milestones
C) Dừng tại đây — đã đủ thông tin để tự implement
```

---

## PHASE 4 — Blueprint Document

### Thực hiện tự động

Tổng hợp tất cả output từ Phase 1-3 thành 1 tài liệu đầy đủ:

```markdown
# SaaS Migration Blueprint — PhuPhatCorp
# Ngày: YYYY-MM-DD

## 1. Executive Summary
[1 đoạn tóm tắt: tại sao chuyển SaaS, mô hình nào, bao nhiêu milestones]

## 2. Current State (từ Phase 1)
[Audit results]

## 3. Target Architecture (từ Phase 2)
[4 pillars chi tiết]

## 4. Migration Plan (từ Phase 3)
[Milestones, risk, timeline]

## 5. Database Schema Changes
[Tất cả tables mới + tables sửa + indexes + migration scripts]

## 6. API Changes
[Endpoints mới + endpoints sửa + middleware stack]

## 7. Frontend Changes
[Pages mới + pages sửa + routing changes]

## 8. Infrastructure Changes
[DNS, SSL, hosting, scaling]

## 9. Risk Mitigation
[Per milestone]

## 10. Decision Log
[Các quyết định kiến trúc đã đưa ra trong quá trình quy hoạch]
```

Lưu tại:
```
docs/architecture/YYYYMMDD_saas-migration-blueprint.md
```

Cập nhật `.claude/knowhow/decisions.md` với các quyết định kiến trúc quan trọng.

---

## PHASE 5 — Implement Milestone

### Khi user muốn implement một milestone cụ thể

**Input:** "Implement milestone M1" hoặc "Bắt đầu M2"

**Thực hiện:**

1. Đọc blueprint từ `docs/architecture/YYYYMMDD_saas-migration-blueprint.md`
2. Xác định milestone cần implement
3. Kiểm tra dependencies đã hoàn thành chưa
4. Chọn workflow phù hợp:
   - Milestone tạo feature mới → gọi workflow `feature-dev`
   - Milestone sửa feature có sẵn → gọi workflow `change-request`
   - Milestone thuần infrastructure → thực hiện trực tiếp

**Sau khi implement:**

```bash
cd backend && npm run lint && npm run build && npm run test
cd frontend && npm run lint && npm run typecheck && npm run test
```

→ Chuyển Phase 6

---

## PHASE 6 — Migration Verify

### Thực hiện tự động

Ngoài test thông thường, chạy thêm SaaS-specific checks:

**Tenant Isolation Test**
```typescript
describe('Tenant Isolation', () => {
  it('Tenant A không thấy data của Tenant B', async () => {
    // Tạo data cho Tenant A
    // Login as Tenant B user
    // Query → phải trả về 0 rows
  });

  it('Mọi endpoint đều filter theo tenant', async () => {
    // Duyệt qua tất cả GET endpoints
    // Verify response chỉ chứa data của current tenant
  });
});
```

**Plan Gating Test** (sau M3)
```typescript
describe('Plan Gating', () => {
  it('Free plan không truy cập được premium feature', async () => {});
  it('Vượt max_users → trả 402', async () => {});
});
```

**Cross-Tenant Regression**
```
- [ ] Login/logout hoạt động per tenant
- [ ] Data CRUD isolated per tenant
- [ ] File upload/download isolated per tenant
- [ ] Admin chỉ thấy users trong tenant mình
- [ ] Super admin thấy tất cả
```

### Báo cáo milestone

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MILESTONE [MX] HOÀN TẤT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone:      [Tên]
Files đã sửa:   [X] files
Migration:      [Có/Không — tên file]
Tests:          [X] pass, [X] mới
Isolation test: [pass/fail]

Tiến độ tổng: [X/6] milestones hoàn tất
Milestone tiếp: [MX+1 — tên]

Docs đã cập nhật:
  - know-how.md: [có/không]
  - system-features.md: [có/không]
  - decisions.md: [có/không]

→ Commit: feat(saas): [milestone description]
```

Cập nhật knowhow files:
- `know-how.md` → schema mới, endpoints mới
- `system-features.md` → business logic mới (tenant flow, subscription flow)
- `decisions.md` → quyết định kiến trúc SaaS

---

## Quy tắc bất biến

- **KHÔNG implement trước khi quy hoạch xong** — Phase 1-4 phải hoàn tất trước Phase 5
- **KHÔNG implement 2 milestones cùng lúc** — mỗi milestone kết thúc ở trạng thái app chạy được
- **KHÔNG skip dependency** — M2 phải xong trước M4, kiểm tra trước khi bắt đầu
- **Tenant isolation là ưu tiên số 1** — data leak giữa tenants là lỗi critical
- **Mọi query phải có tenant filter** — sau M2, audit lại tất cả queries
- **Backward compatible** — existing data phải hoạt động bình thường sau mỗi milestone
- **Backup trước mỗi migration** — đặc biệt M1 và M2
- **Escape hatch:** Migration fail → rollback script, báo cáo user, dừng