---
name: user-guide
description: Viết hướng dẫn sử dụng cho end user (không technical). Đọc BA doc, UI Spec, source code để viết guide chính xác với thực tế. Gọi skill này khi cần viết tài liệu hướng dẫn cho một feature.
---

# User Guide Writer

Khi skill này được load, bạn viết hướng dẫn cho người dùng cuối. Luôn đọc source code để đảm bảo guide khớp thực tế (label nút, thông báo, validation).

## Quy tắc

1. **Chỉ dừng 1 lần:** Phase 1 — khi không tìm thấy source code VÀ không có doc.
2. **Còn lại tự động đến khi xong.**

## 4 Phase

```
Phase 1: GATHER → đọc doc + source code, đối chiếu
  ↓ (chỉ dừng nếu thiếu)
Phase 2: PLAN   → xác định scope, luồng, audience
Phase 3: WRITE  → viết theo template
Phase 4: REVIEW → self-review checklist
```

---

## Phase 1 — Gather

Đọc theo thứ tự: `docs/ba/` → `docs/ui/` → `system-features.md` → FE source code → BE source code.

Thu thập: label nút (từ i18n), thông báo, validation message, điều kiện render, business rule.

Đối chiếu doc vs code: code có mà doc không → ưu tiên code. Mâu thuẫn → ghi `[cần confirm]`.

Nếu không tìm được source code VÀ không có doc → hỏi user. Ngược lại → tự động qua Phase 2.

---

## Phase 2 — Plan

Xác định: scope (single/multi-flow/module), audience (role nào), luồng chính + phụ.

---

## Phase 3 — Write

### Template

```markdown
# Hướng dẫn: [Tên tính năng]

> **Dành cho:** [Role] | **Cập nhật:** YYYY-MM-DD

## Tổng quan
[1-3 câu — làm gì, khi nào dùng. Không thuật ngữ kỹ thuật.]

## Điều kiện sử dụng
- [ ] Đăng nhập tài khoản **[role]**
- [ ] [Điều kiện khác]

> Nếu không thấy menu/nút, tài khoản chưa được cấp quyền.

## [Luồng 1: Tên hành động]

> **Mục tiêu:** [Kết quả]

**Bước 1 — [Tên bước]**
[Mệnh lệnh: "Nhấn", "Chọn", "Nhập".]

**Bước 2 — [Tên bước]**
[Hành động.]

**Bước 3 — Kết quả**
- Thông báo: *"[Nội dung]"*

## Lưu ý

| Tình huống | Giải thích |
|---|---|
| [Nút bị mờ] | [Lý do] |
| [Lỗi "..."] | [Cách xử lý] |

## FAQ

**Q: [Câu hỏi]**
A: [Trả lời]

**Q: Lỗi không có trong danh sách?**
A: Chụp màn hình, liên hệ hỗ trợ.
```

### Nguyên tắc viết

- Cho người không biết kỹ thuật — không API, schema, endpoint
- Tên nút **in đậm**, đúng chính xác (từ i18n)
- Mệnh lệnh rõ: "Nhấn nút **Lưu**"
- Không bịa — không biết label → ghi `[cần verify]`

---

## Phase 4 — Self-review

- [ ] Mỗi luồng trong doc đã cover
- [ ] Điều kiện tiên quyết đầy đủ
- [ ] Lỗi phổ biến có trong "Lưu ý"
- [ ] Không thuật ngữ kỹ thuật
- [ ] Tên nút khớp hoặc `[cần verify]`
- [ ] Có Tổng quan + Điều kiện + FAQ

---

## Output

Lưu: `docs/user-guide/YYYYMMDD_[feature]-guide.md`

---

## Quy tắc

- Không thuật ngữ kỹ thuật — viết cho end user
- Không bỏ self-review
- Không bịa label — ghi `[cần verify]`
- Đọc source code trước khi viết
- Doc vs code mâu thuẫn → ưu tiên code
