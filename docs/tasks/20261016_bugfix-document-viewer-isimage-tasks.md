# Task List: Bugfix DocumentViewerModal isImage ReferenceError
**Ngày:** 2026-10-16
**Lỗi:** `ReferenceError: Cannot access 'isImage' before initialization` tại `DocumentViewerModal.tsx:113`

---

## 🎨 FRONTEND TASKS

| ID   | Task | Chi tiết kỹ thuật | Effort |
|------|------|-------------------|--------|
| BFE-01 | Sửa thứ tự khai báo biến `isImage` | Di chuyển `const isImage = doc?.mime_type?.startsWith('image/');` lên đầu component trước các `useCallback`, xóa dòng khai báo cũ | S |
| BFE-02 | Verify & Typecheck | Chạy `npm run typecheck` + `npm run build` ở frontend, đảm bảo không còn lỗi runtime TDZ | S |

## 📊 Thứ tự thực hiện
BFE-01 → BFE-02
