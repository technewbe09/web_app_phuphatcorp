# Bug Fix Task List: CORS Multiple Origins
**Ngày:** 2026-04-08
**Bug:** CORS block local frontend khi .env config cho prod origin
**Root cause:** CORS middleware chỉ accept 1 origin string, cần support multiple origins

---

## ⚙️ BACKEND TASKS

| ID    | Task | File cần sửa / tạo | Mô tả chi tiết | Effort |
|-------|------|--------------------|----------------|--------|
| BBE-01 | Update CORS config to whitelist | `backend/src/app.ts` | Thay `origin: string` bằng `origin: function` để validate dynamic. Whitelist gồm: `http://localhost:5173`, `http://localhost:5174`, `https://phuphatcorp.scrapetool.cloud`. | S |
| BBE-02 | Update .env documentation | `backend/.env` | Thêm comment giải thích `CORS_ORIGIN` (nếu cần override whitelist cho env đặc biệt) | S |

## 📊 Thứ tự thực hiện
BBE-01 → BBE-02

## ⚠️ Ràng buộc khi fix
- Chỉ thay đổi CORS config trong `app.ts`
- Không refactor code xung quanh
- Phải test cả local và prod origin sau khi fix
- Whitelist phải include cả `localhost:5173` (default Vite) và `localhost:5174` (backup port)
