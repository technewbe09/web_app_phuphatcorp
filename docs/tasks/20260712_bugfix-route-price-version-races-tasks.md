# Task List: Bugfix — Route price version races

**Ngày:** 2026-07-12  
**Bug:** check-then-write trên `createAbsolutePrice` / `adjustPercentGlobal` + thiếu UNIQUE  
**Severity:** High

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|----|------|-------------------|--------|
| BBE-01 | Migration unique indexes | `036_route_price_versions_race_guards.sql` | S | ✅ |
| BBE-02 | Fix `createAbsolutePrice` | TX + FOR UPDATE + unique map | M | ✅ |
| BBE-03 | Fix `adjustPercentGlobal` | FOR UPDATE + close WHERE open | M | ✅ |
| BBE-04 | Regression tests | `routePricingService.test.ts` + lessons-learned | S | ✅ |

## 📊 Thứ tự

BBE-01 → BBE-02 → BBE-03 → BBE-04

## ⚠️ Lưu ý

- Migration idempotent (`IF NOT EXISTS`)
- Không đổi API contract
- Wire vào `apply-route-pricing-migrations.ts` nếu script liệt kê file
