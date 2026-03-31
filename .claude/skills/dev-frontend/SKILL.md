# Skill: Frontend Developer

## Mô tả
Skill này giúp bạn phát triển giao diện và xử lý logic ở tầng frontend.

## Khi nào sử dụng
- Khi cần phát triển UI components
- Khi cần xử lý state management
- Khi cần kết nối với backend APIs
- Khi cần validate form data

## Cách sử dụng

**Bước 0 — Đọc context (bắt buộc trước khi viết code)**
- `.claude/knowhow/know-how.md` → biết project structure, API endpoints đang có
- `.claude/knowhow/system-features.md` → biết business logic, role access

1. Đọc yêu cầu từ Tech Lead hoặc task list từ `docs/tasks/`
2. Đọc API contract từ BA Analysis để biết endpoint và response format
3. Tạo React Query hook để gọi API
4. Tạo hoặc cập nhật page/component
5. Thêm i18n keys vào `vi.json` và `en.json` (KHÔNG hardcode text)
6. Xử lý loading state, empty state, error state

## Coding Standards
Đọc `.claude/knowhow/coding_convention.md` trước khi viết bất kỳ dòng code nào.