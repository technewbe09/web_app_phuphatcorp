# Brief: Chèn Sheet "Processed v2" vào Chức năng Xử lý Data 5 nhà
**Ngày:** 2026-10-02  
**Loại:** LIGHT  
**Feature:** Xử lý data 5 nhà (`/delivery-data/5-houses`) & Xử lý Batch Data Import (`/accounting/delivery-data/import`)

---

## 1. Tóm tắt yêu cầu (Shared Understanding)

Dựa trên kết quả phỏng vấn làm rõ yêu cầu (/grill-me):
1. **Vị trí và Thứ tự Sheet trong Workbook output**:
   - Thêm sheet `"Processed v2"` ngay sau sheet `"Processed"`.
   - Thứ tự chuẩn 8 sheets trong file Excel tải về:
     `Sheet` (dữ liệu thô gốc) ➔ `Processed` ➔ `Processed v2` ➔ `CLF` ➔ `VFM` ➔ `MCC` ➔ `CLV` ➔ `NDFC`.
2. **Quy tắc và nội dung chuẩn hóa của `Processed v2`**:
   - Nhân bản trực tiếp từ sheet `Processed`. Thứ tự cột, tiêu đề và giá trị của `5 nhà` và `Gạo` giữ nguyên như `Processed`. Không kéo `5 nhà` lên trước `CLF`. Không thêm cột `Gạo` khi `Processed` không có cột này. Không ghi đè số `5 nhà` trên dòng tổng.
   - **Ép kiểu dữ liệu số (`number`)**: Số lượng (cột O, format `#,##0`), SP Net (cột P), HĐ Net (cột Q), Round(MT) và các cột `CLF`, `VFM`, `MCC`, `CLV`, `NDFC` (format `#,##0.000`). Ô không phải số ở các cột nhà thành ô trống. Với `5 nhà` và `Gạo`: chữ đọc được thành số thì ghi number và format `#,##0.000`; ô đã là số giữ giá trị và format nguồn; chữ khác giữ nguyên.
   - Không thấy header `5 nhà` hoặc `5 nha` trong ba dòng đầu thì tải chuyến đọc cột 24. Có header thì đọc đúng cột đó. Không tự điền chữ header.
   - **Tính lại Khung giá theo tải trọng chuyến**:
     - Căn cứ đúng số trên ô `5 nhà` của dòng tổng. Không cộng `CLF`…`NDFC` và `Gạo`. Không lấy max với Round(MT).
     - Dòng tổng trống hoặc bằng 0: lấy ô `5 nhà` của dòng chi tiết đầu. Không có thì cộng `5 nhà` từng dòng. Vẫn không có thì cộng Round(MT) từng dòng.
     - Bậc tải:
       - `≤ 2.5 tấn`
       - `>8-16 tấn`
       - `>16-23 tấn`
       - `>23 tấn`
       - Pallet: ghi `Pallet`.
     - Tải chuyến trong khoảng (2,5–8] và không phải Pallet: giữ nguyên khung trên sheet `Processed`, không tô vàng.
     - Nếu Khung giá tính lại khác với Khung giá ban đầu: ô được tô nền màu vàng nhạt `#FFE599` và gắn Cell Note ghi rõ khung giá gốc.
     - Một biển số là xe lớn khi trong file có chuyến khác nặng hơn 8 tấn, hoặc chuyến Pallet. Pallet nhận theo số tàu `PPH-P` / `-P`, hoặc khung chứa chữ Pallet. Biển số được ghép sau khi cắt khoảng trắng thừa và không phân biệt hoa thường.
     - Chỉ khối có khung gốc đúng `≤2.5 tấn` và tải chuyến không quá 2,5 tấn mới được kiểm tra. Khối này được cảnh báo khi biển số của nó là xe lớn nhờ một chuyến khác trong file, kể cả khi hai chuyến khác ngày và không đứng kề nhau. `<=2.5 tấn`, nhãn có khoảng trắng hoặc dấu phẩy không vào cảnh báo này. Khối gắn nhãn `≤2.5 tấn` nhưng tải nặng hơn 2,5 tấn vẫn tính lại khung; khối đó vẫn là bằng chứng xe lớn cho chuyến 2,5 tấn khác khi tải lớn hơn 8 tấn hoặc khi nó là Pallet.
     - Không đổi khung, đơn vị tính, hay tổng chuyến của khối bị cảnh báo. Tô cột Khung giá nền `#F8CBAD` và ghi chú đúng câu `Cần kiểm tra tách chuyến`. Chuyến số tàu Pallet mang nhãn `≤2.5 tấn` mà không đủ điều kiện thì vẫn đổi khung thành `Pallet`. Dòng 1 của sheet luôn là danh sách số hóa đơn của các chuyến bị cảnh báo, hoặc `Cần kiểm tra tách chuyến: không có`. Chuyến không có số hóa đơn vẫn được tô và ghi chú.
3. **Đảm bảo không ảnh hưởng đến chức năng Data import**:
   - Sheet đầu tiên của workbook output luôn là sheet `"Sheet"` (dữ liệu thô nguyên bản), bảo đảm tương thích hoàn toàn nếu file được upload vào API import (`POST /api/delivery-data/import`).
   - Khi chạy "Xử lý data" từ các batch đã lưu trong DB trên trang `DeliveryImportPage`, hàm `processDeliveryDataFromRows` xuất file đồng bộ có `Processed v2` an toàn mà không phát sinh lỗi.
   - Giữ nguyên cơ chế tương thích an toàn với Bảng kê thô ND-MCC trên backend.

---

## 2. Files ảnh hưởng

| File | Loại thay đổi | Chi tiết |
|------|---------------|----------|
| `frontend/src/utils/processDeliveryData.ts` | Cập nhật | 1. Tích hợp helper chuẩn hóa `generateProcessedV2Sheet` tương tự quy chuẩn đã có.<br>2. Chèn sheet `Processed v2` ngay sau sheet `Processed` tại Step 5 trong `processDeliveryDataFromRows`.<br>3. Đảm bảo cấu trúc styling, định dạng số, tô màu cell note khi đổi khung giá. |
| `frontend/src/pages/admin/DeliveryDataPage.tsx` | Kiểm tra | Xác nhận luồng chạy và tải file hoạt động mượt mà. |
| `frontend/src/pages/admin/accounting-data/DeliveryImportPage.tsx` | Kiểm tra | Xác nhận luồng xử lý batch từ DB xuất file đồng bộ thành công. |

---

## 3. Rủi ro & Giải pháp

- **Rủi ro:** Khi sinh sheet `Processed v2` trên trình duyệt bằng ExcelJS, việc sao chép style, clone row và chèn Cell Note có thể gặp vấn đề về bộ nhớ nếu file rất lớn hoặc cú pháp cell note không tương thích browser.
- **Giải pháp:** Sử dụng giải pháp đã kiểm chứng từ `processedV2.ts` (clone row, gán note chuẩn ExcelJS, chỉ xử lý in-memory workbook), xử lý an toàn try/catch khi sao chép views/merges.
