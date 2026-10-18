---
name: ui-ux-design
description: Skill phác thảo UI Spec cho feature mới. Invoke sau khi BA Analysis hoàn tất. Đọc BA doc → xây dựng user journey, screen inventory, component checklist, validation UX → lưu thành UI Spec cho dev-frontend implement và test-qa đối chiếu.
---

# Skill: UI/UX Design
# BA Doc → User Journey → Screen Inventory → Component Checklist → UI Spec

## Mô tả

Skill này chuyển BA Analysis (mô tả logic nghiệp vụ) thành UI Spec (mô tả giao diện cụ thể).
`dev-frontend` phải đọc UI Spec trước khi viết bất kỳ dòng code nào.
`test-qa` dùng UI Spec làm checklist đối chiếu khi QA functional.

---

## Input

- BA Analysis: `docs/ba/YYYYMMDD_[feature]-analysis.md`
- Design guideline: `web-design-guidelines` skill (fetch từ Vercel)
- Context hệ thống: `.opencode/knowhow/system-features.md`

---

## Thực hiện

### Bước 1 — Đọc BA Analysis

Xác định:
- Có bao nhiêu màn hình / modal / drawer cần thiết
- Role nào có quyền truy cập từng màn hình
- Data nào cần hiển thị (từ Data Model + API Contract)
- Những action user có thể thực hiện

### Bước 2 — Vẽ User Journey

Mô tả hành trình thực tế của người dùng từ điểm vào đến kết quả, **không phải logic hệ thống**:

```
[Điểm vào] → [User thấy gì] → [User làm gì] → [Hệ thống phản hồi gì] → [Bước tiếp theo / End]
```

Gồm cả:
- Happy path (luồng thành công)
- Alternative paths (chọn hủy, quay lại)
- Error paths (submit fail, không có quyền, không có data)

### Bước 3 — Screen Inventory

Mỗi màn hình / modal / drawer mô tả đầy đủ:
- Layout tổng thể
- Các vùng nội dung (header, filter, table/list/form, action buttons)
- Điều kiện hiển thị (role, trạng thái data)
- Tất cả states phải render

### Bước 4 — Component & State Checklist

Liệt kê component cần tạo và tất cả states bắt buộc handle.

### Bước 5 — Validation UX

Định nghĩa cách hiển thị lỗi cho từng loại.

### Bước 6 — Web Design Guidelines Check

Dùng skill `web-design-guidelines` để verify UI Spec tuân thủ guideline trước khi lưu.

---

## Output — UI Spec

Lưu tại: `docs/ui/YYYYMMDD_[feature]-ui-spec.md`

```markdown
# UI Spec: [Tên feature]
**Ngày:** YYYY-MM-DD
**BA Doc:** docs/ba/YYYYMMDD_[feature]-analysis.md
**Role liên quan:** [admin / customer / cả hai]

---

## 1. User Journey

### Happy Path
```
[Điểm vào, vd: Sidebar → "Quản lý đơn hàng"]
  → Trang danh sách hiển thị (loading skeleton → data)
  → User lọc theo trạng thái / tìm kiếm
  → User click "Xem chi tiết" một đơn
  → Modal chi tiết mở ra
  → User click "Xác nhận" / "Từ chối"
  → Toast success → modal đóng → danh sách refresh
```

### Alternative Paths
```
- User click "Hủy" trong form → đóng modal, không lưu
- User không có quyền → redirect về trang chủ, toast error
```

### Error Paths
```
- API submit fail → toast error, form vẫn mở, data không mất
- Load danh sách fail → error state với nút "Thử lại"
```

---

## 2. Screen Inventory

### Screen [1]: [Tên màn hình]
**Route:** `/[đường dẫn]`
**Role:** [admin / customer]
**Điều kiện hiển thị:** [Luôn hiển thị / Chỉ khi có data / ...]

#### Layout
```
┌─────────────────────────────────────────┐
│ [Page Title]              [+ Nút thêm]  │
├──────────────────────┬──────────────────┤
│ [Search input]       │ [Filter dropdown]│
├─────────────────────────────────────────┤
│ [Table / List / Grid]                   │
│   Col 1 | Col 2 | Col 3 | Actions       │
│   ...                                   │
├─────────────────────────────────────────┤
│ [Pagination]                            │
└─────────────────────────────────────────┘
```

#### States
| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Loading | Đang fetch data | Skeleton loader toàn bộ table |
| Empty | API trả về `[]` | Illustration + text "Chưa có dữ liệu" + nút CTA nếu có |
| Error | API fail | Text lỗi + nút "Thử lại" |
| Populated | Có data | Table với data đầy đủ |

#### Actions
| Action | Trigger | Kết quả |
|--------|---------|---------|
| [Tên action] | Click [nút/icon] | [Mở modal / Navigate / Call API / ...] |

---

### Screen [2]: [Tên modal / drawer / form]
**Loại:** Modal / Drawer / Page
**Mở khi:** [Điều kiện]

#### Layout
```
┌─────────────────────────────┐
│ [Modal Title]           [X] │
├─────────────────────────────┤
│ [Field 1 label]             │
│ [Input / Select / ...]      │
│                             │
│ [Field 2 label]             │
│ [Input / Select / ...]      │
├─────────────────────────────┤
│ [Hủy]          [Xác nhận]  │
└─────────────────────────────┘
```

#### States
| State | Trigger | UI hiển thị |
|-------|---------|-------------|
| Default | Mở modal mới | Form rỗng, nút submit enabled |
| Edit mode | Mở từ record có sẵn | Form pre-filled với data hiện tại |
| Submitting | Click submit | Nút submit disabled + spinner, form lock |
| Submit error | API fail | Toast error, form mở lại, data giữ nguyên |
| Submit success | API success | Toast success, modal đóng, list refresh |

---

## 3. Component Checklist

### Danh sách components cần tạo / cập nhật

| Component | File path | Loại | Dùng ở |
|-----------|-----------|------|--------|
| [TênComponent] | `apps/[admin\|customer]/components/[path]` | Mới / Cập nhật | [Screen nào] |

### States bắt buộc mọi component data phải có

```
- [ ] Loading state  — skeleton hoặc spinner (không để blank)
- [ ] Empty state    — message rõ ràng, có CTA nếu user có thể tạo data
- [ ] Error state    — thông báo lỗi + nút "Thử lại"
- [ ] Success feedback — toast message sau mọi create / update / delete
- [ ] Confirm dialog — trước mọi action destructive (delete, reject, cancel)
- [ ] Disabled state — nút submit khi đang submitting
```

---

## 4. Validation UX

| Trường hợp | Hiển thị ở đâu | Khi nào show | Ví dụ message |
|------------|---------------|--------------|---------------|
| Required field trống | Inline dưới field | Khi blur hoặc submit | "Trường này là bắt buộc" |
| Format sai (email, số) | Inline dưới field | Khi blur | "Email không hợp lệ" |
| Business rule vi phạm (từ API) | Toast error | Sau khi submit | "Mã đã tồn tại trong hệ thống" |
| Server error (500) | Toast error | Sau khi submit | "Lỗi hệ thống, vui lòng thử lại" |
| Session hết hạn (401) | Redirect login | Khi nhận 401 | — |

---

## 5. i18n Keys cần thêm

```
[feature].[screen].title = "[..."
[feature].[screen].empty = "Chưa có dữ liệu"
[feature].[screen].error = "Không thể tải dữ liệu"
[feature].action.[action] = "[Tên action]"
[feature].message.success.[action] = "[Thông báo thành công]"
[feature].message.error.[action] = "[Thông báo lỗi]"
[feature].confirm.[action] = "Bạn có chắc muốn [action]?"
```
```

---

## Quy tắc bất biến

- **KHÔNG để dev-frontend tự quyết layout** — mọi màn hình phải có trong Screen Inventory
- **KHÔNG bỏ sót states** — loading / empty / error là bắt buộc với mọi component fetch data
- **KHÔNG hardcode text** — mọi string phải có i18n key trong spec
- **KHÔNG skip Web Design Guidelines check** — verify trước khi lưu UI Spec
- **UI Spec phải sync với BA doc** — nếu BA thay đổi, UI Spec phải cập nhật theo