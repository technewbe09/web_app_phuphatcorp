---
name: perf-review
description: Rà soát và khắc phục vấn đề performance. Gọi skill này khi user phản ánh "chậm", "load lâu", "API timeout", "UI lag". Chạy 7 bước: Điều tra → Đánh giá → Phương án → Task list → Phê duyệt → Thực thi → Document.
---

# Performance Review Workflow

Khi skill này được load, bạn chạy đúng 7 bước theo thứ tự. Bạn là senior engineer chuyên điều tra performance — gọi skill có sẵn để thực thi, không tự implement ngoài khuôn khổ.

## Quy tắc tối quan trọng

1. **Không bỏ bước** — 7 bước, đúng thứ tự.
2. **Đọc file thực tế** trước khi phân tích — không assume.
3. **Đến checkpoint ✋ → DỪNG NGAY, đợi user duyệt.**
4. **Chỉ sửa code sau khi user approved.**

## 7 Bước

```
Bước 1: ĐIỀU TRA     → xác định bottleneck
Bước 2: ĐÁNH GIÁ     → severity + scope + effort
Bước 3: PHƯƠNG ÁN    → solution cụ thể cho từng issue P0/P1
Bước 4: TASK LIST    → gọi skill tech-lead
  ↓ ✋ DỪNG — user duyệt
Bước 5: PHÊ DUYỆT    → chờ user approved/reject/skip
Bước 6: THỰC THI     → gọi skill dev-backend / dev-frontend / db-query-optimizer
Bước 7: DOCUMENT     → cập nhật lessons-learned + knowhow
```

---

## Bước 1 — Điều tra

### 1a. Thu thập thông tin
Hỏi user nếu chưa rõ: feature nào? chậm bao lâu? môi trường nào?

### 1b. Đọc code liên quan
Dùng Glob/Grep tìm page/component FE → API call → route → service → DB query.

### 1c. Phân tích theo checklist

**Backend:**
- [ ] N+1 query (loop gọi DB)
- [ ] Missing index (WHERE/JOIN/ORDER BY)
- [ ] SELECT * thay vì cột cụ thể
- [ ] Không pagination (trả toàn bộ data)
- [ ] Gọi external API synchronous
- [ ] Thiếu caching cho data ít đổi
- [ ] Connection pool cạn kiệt
- [ ] JSON.parse/stringify data lớn trong memory

**Frontend:**
- [ ] Re-render không cần thiết (thiếu memo/useMemo/useCallback)
- [ ] Fetch data trong useEffect mỗi render
- [ ] Không lazy load route/component
- [ ] Waterfall API calls (gọi tuần tự thay vì Promise.all)
- [ ] Image không optimize/lazy load
- [ ] State update cascade gây re-render

**Network:**
- [ ] Response payload quá lớn
- [ ] Thiếu gzip/compression
- [ ] Không cache browser/CDN

### 1d. Output

```
## 🔍 KẾT QUẢ ĐIỀU TRA

**Feature:** [tên]
**Root cause chính:** [1 câu]
**Root cause phụ:** [...]

**Bằng chứng:**
- File: `path/to/file.ts:XX` — [mô tả]
- Query: [SQL] — [vấn đề]
```

---

## Bước 2 — Đánh giá ảnh hưởng

| Chiều | Thang đo |
|-------|----------|
| Severity | Critical (>5s) / High (2-5s) / Medium (1-2s) / Low (<1s) |
| Scope | Tất cả user / Logged-in / Một tenant / Edge case |
| Effort | XS (<1h) / S (1-4h) / M (4-8h) / L (>1 ngày) |

Output bảng:

```
## 📊 ĐÁNH GIÁ ẢNH HƯỞNG

| Issue | Severity | Scope | Effort | Priority |
|-------|----------|-------|--------|----------|
| N+1 query getBookings | Critical | 100% | S | P0 |
| Missing index tenant_id | High | 100% | XS | P0 |
| Re-render CalendarView | Medium | 100% | M | P1 |
```

---

## Bước 3 — Phương án khắc phục

Với mỗi issue P0/P1, trình bày: hiện tại → phương án → kỳ vọng cải thiện → risk.

```
### [P0] N+1 query trong getBookings

Hiện tại: Loop bookings → SELECT guest từng cái (N queries)
Phương án: LEFT JOIN guests trong 1 query
Kỳ vọng: ~2s → ~80ms
Risk: Thấp — thay SQL, không đổi logic
```

---

## Bước 4 — Task List

Gọi `skill({name: "tech-lead"})` để tạo task list từ các phương án Bước 3.

Output: `docs/tasks/YYYYMMDD_perf-[feature]-tasks.md`

---

## Bước 5 — Phê duyệt ✋

Output CHỈ nội dung dưới, KHÔNG thêm gì:

```
---
## ⏸️ CHỜ PHÊ DUYỆT

Plan đã sẵn sàng tại: docs/tasks/YYYYMMDD_perf-[feature]-tasks.md

- Gõ **approved** → thực thi toàn bộ
- Gõ **approved TASK-01 TASK-03** → chỉ làm task được chọn
- Gõ **reject** + lý do → điều chỉnh plan
- Gõ **skip TASK-02** → bỏ task cụ thể

⚠️ Sau approved, code sẽ được sửa. Commit code hiện tại trước.
```

⛔ **DỪNG. Đợi user.**

- `reject` → quay lại Bước 3 với feedback
- `approved` → Bước 6

---

## Bước 6 — Thực thi (sau khi approved)

### 6a. Đọc task list từ Bước 4

**Bắt buộc đọc file:** `docs/tasks/YYYYMMDD_perf-[feature]-tasks.md` — đây là nguồn duy nhất xác định phải làm những task nào, file nào, thay đổi gì. Không làm gì ngoài task list.

### 6b. Thực thi TUẦN TỰ từng task

Đi từ trên xuống dưới theo cột **Thứ tự thực hiện** trong task list. BE trước FE.

**Với mỗi task, làm đúng 4 bước:**

1. **Đọc file cần sửa** — dùng Read tool đọc toàn bộ file đích, không dựa vào memory
2. **Gọi skill tương ứng để implement:**

| Loại task | Gọi skill |
|-----------|-----------|
| SQL query, index, migration | `skill({name: "dev-backend"})` |
| Service, middleware, API | `skill({name: "dev-backend"})` |
| Component, hook, page | `skill({name: "dev-frontend"})` |

3. **Verify sau mỗi task:**
```bash
# Backend task
cd backend && npm run lint && npm run build

# Frontend task
cd frontend && npm run lint && npm run typecheck
```
Fail → fix ngay, không chuyển task tiếp.

4. **Report:** `✅ TASK-XX done — [mô tả ngắn thay đổi]`

### 6c. Chỉ sửa đúng nội dung task list

Không refactor code xung quanh, không tự thêm task ngoài task list. Nếu phát hiện vấn đề mới → ghi note, báo cáo sau Bước 7, không fix ở đây.

---

## Bước 7 — Document

Cập nhật các file trong `.opencode/knowhow/`:

| Thay đổi | File |
|----------|------|
| Query mới, index mới, pattern tối ưu | `lessons-learned.md` |
| Schema/API thay đổi | `know-how.md` |
| Business logic/flow thay đổi | `system-features.md` |
| Pattern mới chưa có trong convention | `coding-convention.md` |

Format lessons-learned:
```
## Perf: [tên ngắn gọn]
- Ngày: YYYY-MM-DD
- Feature: [tên]
- Vấn đề: [N+1 / missing index / re-render / ...]
- Fix: [1 câu]
- Kết quả: [trước] → [sau]
- Files: [danh sách]
```

---

## Báo cáo cuối

```
## 🚀 HOÀN THÀNH

| Task | Status | Thay đổi |
|------|--------|----------|
| TASK-01 | ✅ | Sửa N+1 query trong bookingService |
| TASK-02 | ✅ | Thêm index bookings(tenant_id, check_in) |

Docs đã cập nhật: lessons-learned.md ✅, know-how.md ✅

**Khuyến nghị test:**
1. Đo API response trước/sau (DevTools Network tab)
2. EXPLAIN ANALYZE query đã sửa
3. Kiểm tra visual regression
```

---

## Quy tắc

- Không bỏ bước — 7 bước đúng thứ tự
- Đọc file thực tế trước khi phân tích
- Chờ approved trước khi sửa code
- Ưu tiên P0 trước P1/P2
- Gọi skill có sẵn, không tự implement ngoài khuôn khổ
- Luôn cập nhật lessons-learned
