---
description: Ghi lại các quyết định kiến trúc và kỹ thuật quan trọng của dự án PhuPhatCorp. Agents đọc file này để hiểu tại sao hệ thống được xây dựng theo cách hiện tại, tránh đưa ra giải pháp mâu thuẫn với những gì đã được cân nhắc kỹ.
---

# Decisions — PhuPhatCorp

## Cách đọc file này

Tìm theo **tag** để lọc nhanh:
- `[architecture]` — quyết định về cấu trúc hệ thống tổng thể
- `[database]` — quyết định về schema, migration, query strategy
- `[backend]` — quyết định về package, pattern, API design
- `[frontend]` — quyết định về component, state, routing
- `[security]` — quyết định về auth, permission, data protection
- `[infrastructure]` — quyết định về deploy, môi trường, VPS

Mỗi entry có trường **Xem xét lại khi** — agent dùng trường này để biết khi nào quyết định cũ cần được re-evaluate thay vì áp dụng mù quáng.

## Cách ghi vào file này

Thêm entry mới ở **đầu danh sách** (mới nhất lên trên).
Ghi khi: chọn package mới, thay đổi pattern, từ chối một giải pháp có lý do rõ ràng.
Không ghi những quyết định hiển nhiên hoặc có thể đổi lại dễ dàng.

---

## Entries

<!-- Thêm entries mới ở đây, mới nhất lên trên -->

---

## [architecture] Chọn Monorepo cho cấu trúc project

- **Ngày:** 2026-03-30
- **Quyết định:** Đặt frontend và backend trong cùng một repository (`web_v2/`)
- **Lý do:** Dự án ban đầu đơn giản, team nhỏ (1 người), không cần split repo. Monorepo dễ quản lý, shared tooling, đồng bộ development.
- **Đã cân nhắc nhưng không chọn:** Multi-repo (phù hợp khi team split rõ ràng, CI/CD riêng biệt)
- **Trade-off chấp nhận:** Khi project lớn hơn có thể cần tách, lúc đó dùng workspace tool (pnpm, npm workspaces, hoặc Turborepo)
- **Xem xét lại khi:** Team có từ 3+ dev backend + 3+ dev frontend làm việc đồng thời, hoặc deployment cycle khác nhau

---

## [backend] Dùng pg (node-postgres) thay vì ORM (Prisma/Knex)

- **Ngày:** 2026-03-30
- **Quyết định:** Dùng `pg` Pool thuần, viết SQL tay trong service functions
- **Lý do:** Dự án kế toán cần query phức tạp, báo cáo với aggregations. pg cho phép kiểm soát SQL hoàn toàn, không có abstraction layer. Đơn giản, ít dependencies.
- **Đã cân nhắc nhưng không chọn:** Prisma (migration tool mạnh nhưng syntax phức tạp, performance overhead), TypeORM (chậm, API rối)
- **Trade-off chấp nhận:** Phải viết SQL thủ công, tự quản lý connection pool, cần cẩn thận với SQL injection (dùng parameterized queries đã handle)
- **Xem xét lại khi:** Schema phức tạp hơn với nhiều relations, hoặc cần automatic migrations

---

## [backend] JWT tokens: access token (15m) + refresh token (7d)

- **Ngày:** 2026-03-30
- **Quyết định:** Tách access token (ngắn hạn, gửi body) và refresh token (dài hạn, httpOnly cookie)
- **Lý do:** Access token ngắn giảm thiểu risk nếu bị leak. Refresh token dài hạn lưu trong httpOnly cookie tránh XSS. Standard practice cho enterprise apps.
- **Đã cân nhắc nhưng không chọn:** Chỉ dùng access token với expiry dài (đơn giản nhưng kém bảo mật), Session-based auth với server-side storage (stateful, scale khó hơn)
- **Trade-off chấp nhận:** Cần implement refresh endpoint, frontend phải handle 401 để redirect re-login (auto-refresh chưa implement)
- **Xem xét lại khi:** Cần SSO integration, hoặc refresh token rotation strategy

---

## [backend] API response wrap trong `{ success, message, data }` envelope

- **Ngày:** 2026-03-30
- **Quyết định:** Mọi API response đều wrap trong `{ success: boolean, message?: string, data?: T, error?: string }`
- **Lý do:** Frontend luôn có cùng structure để parse. `success` flag giúp phân biệt success/fail ở interceptor level. `message` cho user-facing text. `error` cho debug details.
- **Đã cân nhắc nhưng không chọn:** RESTful không wrap (chỉ dùng HTTP status codes) — khó handle error details, không consistent giữa các endpoints
- **Trade-off chấp nhận:** Payload lớn hơn một chút. Frontend phải unwrap 2 lần (`response.data.data`) — đã được handle ở authApi layer.
- **Xem xét lại khi:** Chuyển sang GraphQL, gRPC, hoặc REST không wrap

---

## [backend] Password hashing: bcryptjs sync API, 10 salt rounds

- **Ngày:** 2026-03-30
- **Quyết định:** Dùng `bcryptjs` với `hashSync` / `compareSync` (synchronous)
- **Lý do:** bcrypt là industry standard cho password hashing. 10 rounds cân bằng security vs performance. Sync API đơn giản hơn trong Node.js context.
- **Đã cân nhắc nhưng không chọn:** Argon2 (security tốt hơn nhưng cần library riêng), bcryptjs async API (không cần thiết với tsx/ts-node dev runner)
- **Trade-off chấp nhận:** bcrypt chậm hơn argon2 (~200ms vs ~50ms), nhưng 10 rounds đủ an toàn cho use case này
- **Xem xét lại khi:** Hardware mạnh hơn, có thể tăng rounds; hoặc industry chuyển sang argon2id standard

---

## [frontend] Dùng Zustand cho auth state thay vì Context-only

- **Ngày:** 2026-03-30
- **Quyết định:** Auth state quản lý bằng Zustand store + AuthContext chỉ để provide cho React tree
- **Lý do:** Zustand cho phép set state từ nhiều nơi (AuthContext login, interceptor 401) mà không prop drilling. Performance tốt hơn Context vì không re-render toàn tree.
- **Đã cân nhắh nhưng không chọn:** Context-only (đủ cho app nhỏ nhưng khi mở rộng performance kém, phải dùng useMemo carefully), Redux (quá nặng cho use case này)
- **Trade-off chấp nhận:** Thêm một abstraction layer. Khi app lớn hơn cần đảm bảo Zustand store không trở nên "god store" chứa mọi thứ.
- **Xem xét lại khi:** Cần persist state (nên dùng zustand/persist middleware), hoặc cần devtools debugging chi tiết

---

## [frontend] Dùng BrowserRouter (JSX) thay vì createBrowserRouter

- **Ngày:** 2026-03-30
- **Quyết định:** Dùng `<BrowserRouter>` + `<Routes>` JSX thay vì `createBrowserRouter` (data router)
- **Lý do:** `createBrowserRouter` tạo Router context outside React tree — AuthProvider bên trong không truy cập được useNavigate(). JSX Router đơn giản, predictable, hoạt động với mọi Context pattern.
- **Đã cân nhắh nhưng không chọn:** `createBrowserRouter` (data router của React Router v6/v7 — mạnh nhưng không tương thích với AuthProvider pattern hiện tại)
- **Trade-off chấp nhận:** Mất một số data router features (loader, action). Khi cần SSR hoặc advanced data fetching thì cần refactor.
- **Xem xét lại khi:** Cần React Router v7 data router features (loaders, actions, pending navigation)

---

## [frontend] AuthProvider không chứa navigation logic

- **Ngày:** 2026-03-30
- **Quyết định:** AuthContext chỉ quản lý auth state (login/logout/setUser), không gọi `useNavigate()`. Navigation xử lý tại page level.
- **Lý do:** AuthProvider mount TRƯỚC Router trong component tree (hoặc cùng cấp). useNavigate() yêu cầu Router context đã mount. Tách biệt concerns: context = state, page = behavior.
- **Đã cân nhắh nhưng không chọn:** Gọi navigate() trong AuthContext (cần useNavigate trong provider — không hoạt động với createBrowserRouter, có thể hoạt động với BrowserRouter nhưng anti-pattern)
- **Trade-off chấp nhận:** Mỗi page cần tự gọi `navigate()` sau login/logout. Hơi repetitive nhưng rõ ràng.
- **Xem xét lại khi:** Cần redirect global khi 401 (axios interceptor) — hiện tại dùng `window.location.href` thay vì navigate vì interceptor không có access tới router context

---

## [frontend] Form validation: React Hook Form + Yup

- **Ngày:** 2026-03-30
- **Quyết định:** Dùng React Hook Form cho form state + Yup cho schema validation
- **Lý do:** RHF quản lý form state hiệu quả, không re-render không cần thiết. Yup cho schema validation rõ ràng, reusable, type inference tốt với `yup.InferType`. Combo này là standard trong React ecosystem.
- **Đã cân nhắh nhưng không chọn:** React Hook Form + Zod (Zod tốt hơn về type safety nhưng hơi verbose), Native form + custom validation (quá nhiều boilerplate), Formik (performance kém, legacy)
- **Trade-off chấp nhận:** Phải import `{ yupResolver }` từ `@hookform/resolvers/yup`. Yup có một số edge cases với nested objects.
- **Xem xét lại khi:** Complex nested forms, hoặc khi Zod trở nên mainstream hơn trong React ecosystem

---

## [frontend] Styling: Tailwind CSS v3 + forwardRef components

- **Ngày:** 2026-03-30
- **Quyết định:** Dùng Tailwind CSS v3, tất cả UI components đều wrap bằng `forwardRef`
- **Lý do:** Tailwind = utility-first, tốc độ phát triển nhanh, consistent design system, không cần separate CSS files. forwardRef cho phép ref forwarding — cần cho form library (RHF hỗ trợ ref-based registration).
- **Đã cân nhắh nhưng không chọn:** CSS Modules (tốt nhưng cần nhiều files hơn), Styled Components (runtime CSS-in-JS overhead, Performance kém hơn Tailwind), CSS thuần (không có type safety, khó maintain)
- **Trade-off chấp nhận:** Tailwind class strings dài, cần có `cn()` helper (clsx + tailwind-merge) để merge classes. Dev cần học Tailwind syntax.
- **Xem xét lại khi:** Cần server-side component styling (Tailwind v4 cải thiện), hoặc design system phức tạp cần component-level CSS

---

## [frontend] Axios cho HTTP client thay vì native fetch

- **Ngày:** 2026-03-30
- **Quyết định:** Dùng Axios cho HTTP calls với interceptors
- **Lý do:** Interceptors mạnh mẽ cho auth (attach token, handle 401). Auto transform JSON. Better error handling. Cancel requests. Typed. Quen thuộc với hầu hết developers.
- **Đã cân nhắh nhưng không chọn:** Native fetch (không có interceptor, phải wrap thủ công, không có cancel), tRPC (overkill cho REST API), RTK Query (tích hợp sâu với Redux, không dùng Redux)
- **Trade-off chấp nhận:** Thêm một dependency. Axios bundle size ~13KB. Với app kế toán này thì acceptable.
- **Xem xét lại khi:** Bundle size trở thành vấn đề, hoặc cần Server-Sent Events / WebSocket (Axios không support tốt)

---

## [security] CORS chỉ cho phép frontend dev URL

- **Ngày:** 2026-03-30
- **Quyết định:** Backend CORS whitelist chỉ có `http://localhost:5173` (frontend dev)
- **Lý do:** Ngăn request từ các origin khác. Credentials enabled để support httpOnly cookie.
- **Trade-off chấp nhận:** Khi deploy production cần update CORS config cho production URL. Chưa có env-based CORS origin (có thể cải thiện sau).
- **Xem xét lại khi:** Deploy production, cần support multiple environments (staging, production)
