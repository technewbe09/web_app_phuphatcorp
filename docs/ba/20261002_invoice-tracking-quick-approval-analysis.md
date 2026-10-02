# BA Analysis: Tab Phê duyệt nhanh cho Theo dõi hóa đơn (Quick Approval Tab)

**Ngày:** 2026-10-02  
**Feature:** Bổ sung Tab "Phê duyệt nhanh" cho chức năng Theo dõi hóa đơn  
**Module:** `invoice_tracking` (`dispatch`)  
**Scope:** FULL  

---

## 1. 🎯 Mô tả yêu cầu & Mục tiêu nghiệp vụ
- Tạo không gian làm việc chuyên biệt dành cho người điều phối / quản lý (`invoice_tracking.manage`), tập trung toàn bộ các chuyến xe / ticket đang ở trạng thái **Chờ duyệt (`pending_review`)**.
- Cho phép người dùng:
  1. **Xem nhanh**: Xem trực tiếp ảnh chứng từ thu nhỏ (thumbnail) ngay trên dòng bảng, nhấp mở phóng to Lightbox.
  2. **Duyệt 1-click tại dòng (Single Approve)**: Phê duyệt "Hoàn thành" ngay lập tức cho từng chuyến xe.
  3. **Yêu cầu bổ sung tại dòng**: Mở hộp thoại nhập lý do bổ sung chứng từ.
  4. **Phê duyệt hàng loạt (Batch Approve)**: Chọn nhiều hoặc chọn tất cả các ticket bằng Checkbox ➔ Phê duyệt hoàn thành đồng loạt chỉ với 1 thao tác xác nhận.

---

## 2. 📋 Business Rules & Logic

- **BR-01 (Dữ liệu hiển thị)**: Chỉ truy vấn các ticket có `invoice_status = 'pending_review'`. Tự động sắp xếp theo thời gian nộp chứng từ / cập nhật gần nhất (`updated_at DESC`).
- **BR-02 (Phân quyền dữ liệu & Workflow)**:
  - Tự động áp dụng `DataScope` (nếu user là tài xế có `owner` scope thì chỉ thấy chuyến của mình; nếu là điều phối/admin `all` thì xem toàn bộ).
  - Kiểm tra quyền `invoice_tracking.manage` và hành động workflow `review_finish` trước khi phê duyệt.
- **BR-03 (Phê duyệt hàng loạt - Batch Finish)**:
  - Input: Danh sách `ticket_ids: number[]` (tối đa 100 ticket / lần).
  - Hệ thống kiểm tra từng ticket trong danh sách:
    - Bắt buộc phải có `invoice_status === 'pending_review'`.
    - Phải thuộc phạm vi dữ liệu được phép truy cập của user.
  - Cập nhật đồng loạt: `invoice_status = 'completed'`, `dispatcher_id = user.userId`, `reviewed_at = NOW()`, `completed_at = NOW()`, `updated_at = NOW()`.
  - Tự động ghi nhận `audit_logs` tương ứng với hành động `REVIEW_FINISH` cho từng ticket.
- **BR-04 (Huy hiệu đếm số lượng)**:
  - Trên tiêu đề tab *"Phê duyệt nhanh"*, hiển thị badge đếm số lượng ticket đang chờ duyệt (ví dụ: `Phê duyệt nhanh (12)` với màu vàng/cam nổi bật).

---

## 3. 🌐 API Contract

### Endpoint mới: `POST /api/invoice-tracking/batch-finish`
- **Quyền hạn**: `JWT` + `invoice_tracking.manage`
- **Request Body**:
  ```json
  {
    "ticket_ids": [328, 329, 330]
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "message": "Đã phê duyệt hoàn thành 3 chuyến xe thành công",
    "data": {
      "success_count": 3,
      "updated_ids": [328, 329, 330],
      "failed_count": 0,
      "errors": []
    }
  }
  ```
