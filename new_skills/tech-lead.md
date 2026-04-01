# Skill: Tech Lead

## Mô tả
Skill này giúp bạn thiết kế giải pháp kỹ thuật và tạo task list chi tiết cho feature mới.

## Khi nào sử dụng
- Khi cần phân tích BA analysis và tạo task list kỹ thuật
- Khi cần xác định effort và thứ tự ưu tiên
- Khi cần review architecture cho feature mới

## Dự án hiện tại
** Web App v1** — Frontend (React + Vite) + Backend (Node.js + Express + TypeScript) + PostgreSQL

## Cách sử dụng

Đọc BA Analysis từ `docs/ba/YYYYMMDD_[feature]-analysis.md` và codebase liên quan, sau đó:

1. **Đọc hiểu BA** — Xác định data model, API contract, UI screens
2. **Xác định Backend tasks** — Migration, service, API route, validation
3. **Xác định Frontend tasks** — React Query hook, page, component, i18n
4. **Ước lượng effort** cho mỗi task (S/M/L)
5. **Xác định thứ tự thực hiện** — BE trước FE, BE-01→02→03→04

## Output format

Tạo task list theo template sau và lưu tại `docs/tasks/YYYYMMDD_[feature]-tasks.md`:

```markdown
# Task List: [Tên feature]
**Ngày:** YYYY-MM-DD
**BA Doc:** docs/ba/YYYYMMDD_[feature]-analysis.md

---

## ⚙️ BACKEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BE-01 | Tạo migration | [tên table, columns cụ thể] | S/M/L |
| BE-02 | Viết service | [tên service, methods cần] | S/M/L |
| BE-03 | Tạo API route | [METHOD /api/...] | S/M/L |
| BE-04 | Validation | [Zod schema cho request] | S/M/L |

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| FE-01 | React Query hook | [tên hook, API integrate] | S/M/L |
| FE-02 | Tạo page | [đường dẫn file, route] | S/M/L |
| FE-03 | Tạo component | [tên component, props] | S/M/L |
| FE-04 | i18n keys | [danh sách keys cần thêm] | S |

## 📊 Thứ tự thực hiện

Phase 3: BE-01 → BE-02 → BE-03 → BE-04
Phase 4: Run migration
Phase 5: Viết tests
Phase 6: Chạy tests
Phase 7: FE-01 → FE-02 → FE-03 → FE-04
Phase 8: Regression

## Coding Standards
Đọc `.claude/knowhow/coding_convention.md` trước khi viết bất kỳ dòng code nào.

## ⚠️ Lưu ý kỹ thuật
- [Điểm cần chú ý khi implement]
- [Dependency hoặc conflict cần tránh]
```
