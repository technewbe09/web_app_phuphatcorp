# BA Analysis: Engine bảng kê thô CLV

**Ngày:** 2026-10-09  
**Feature:** Engine ExcelJS cho nhà `clv` trên Lên bảng kê thô 5 nhà  
**Module:** Dữ liệu kế toán (`bang_ke_tho` / `accounting_data`)  
**Scope:** FULL — business rule mới, một API xử lý mới, nút trên ô CLV. Không thêm bảng, cột, role, migration.  
**Phụ thuộc:** Khung đợt `docs/ba/20260913_bang-ke-tho-5-nha-analysis.md`. Engine ND-MCC `backend/src/services/bangKeTho/ndMccEngine.ts`, `pricingLookup.ts`.  
**Nguồn:** Grill 2026-10-08 đến 2026-10-09. File mẫu `reference/xu_ly_du_lieu_ke_toan/clv 1-8.7.xlsx`. File đợt `reference/xu_ly_du_lieu_ke_toan/1-8.7.xlsx` (sheet `CLV`, 160 dòng, mã nhà cung cấp `CLV`).  
**Ngoài phạm vi:** Engine Calofic / CLF. Không đổi engine ND-MCC. Không thêm ô nhập số hóa đơn, ngày, số bảng kê trên màn hình.

---

## 1. Tổng quan

Kế toán bấm **Xử lý** ở cột CLV của một đợt bảng kê thô. Hệ thống đọc `batches/{batch_id}/input.xlsx`, sinh workbook CLV, lưu `batches/{batch_id}/outputs/clv.xlsx`, chuyển ô CLV sang `ready`. Tên tải giữ prefix đã có: `clv {stem file gốc}.xlsx`.

File đợt mẫu có `Sheet1`, `Processed`, `VFM`, `VFM (2)`, `MCC`, `CLV`, `NDFC`, `STHI`, `STHI (uni)`, `NPP`, `TINH`. Header nghiệp vụ của `CLV` nằm ở dòng 2.

File xuất CLV chỉ giữ `Sheet` (nếu có), `Sheet1` (nếu có), `Processed`, `CLV`, rồi thêm sáu sheet kết quả. Các sheet nguồn còn lại bị xóa.

Sáu sheet kết quả:

| Sheet | Lớp | Dòng lấy từ `CLV` |
|---|---|---|
| `clv tấn` | Dòng hàng | Khung giá khác `≤2.5 tấn` (gồm `Pallet`, `>8-16 tấn`, `>16-23 tấn`, và dòng slot trống) |
| `clv tấn (2)` | Trang bìa, một dòng / hóa đơn | Cùng nhóm `clv tấn`, trừ dòng slot trống |
| `tn-aav-pa` | Trang bìa, một dòng / hóa đơn | Dòng slot trống. File 1–8.7 là `AV7`, `TN3`, `PA9`, `PA3` |
| `clv chuyến+uni-clv` | Dòng hàng | Khung giá đúng `≤2.5 tấn` |
| `clv chuyến` | Trang bìa, một dòng / hóa đơn | `≤2.5 tấn` và slot `GST01_CLV HP` |
| `uni-clv` | Trang bìa, một dòng / hóa đơn, không dòng `Tổng cộng` | `≤2.5 tấn` và slot `GST01_Vinh Tuong` |

Trên file 1–8.7: `clv tấn` 93 dòng hàng / 32 hóa đơn; `clv chuyến+uni-clv` 67 dòng hàng / 30 hóa đơn; trang bìa 28, 4, 23 và 7 hóa đơn.

---

## 2. User stories

| ID | User story | Actor | Quyền |
|---|---|---|---|
| US-01 | Kế toán bấm Xử lý trên ô CLV của đợt có sheet `CLV`, nhận file đúng thứ tự sheet và đúng cách chia dòng. | Kế toán / Quản trị | `accounting_data.manage` |
| US-02 | Kế toán tải file, thấy cước theo sổ giá `CLV`, phụ phí bốc xếp và chuyển tải, công thức tấn và thành tiền. | Kế toán / Viewer | `accounting_data.view` |
| US-03 | File đợt thiếu sheet `CLV` thì ô CLV chuyển `failed` và tooltip nói rõ sheet thiếu. | Kế toán / Quản trị | `accounting_data.manage` |
| US-04 | Ô CLV `ready` có tải và chạy lại. Đang chạy thì spinner. `pending` và `failed` có nút xử lý. | Kế toán / Quản trị | `accounting_data.manage` để xử lý; Viewer chỉ tải khi `ready` |

Ô Calofic giữ badge tĩnh. Ô ND-MCC không đổi.

---

## 3. Business rules

| ID | Quy tắc |
|---|---|
| BR-01 | **Nguồn.** Đọc sheet tên `CLV` (trim, không phân biệt hoa thường). Thiếu sheet thì dừng. Lấy mọi dòng có mã nhà cung cấp `CLV` (trim, không phân biệt hoa thường). Header là dòng 2. Ngày hóa đơn là ngày lịch local (`năm`, `tháng`, `ngày`), không dùng `toISOString().slice(0, 10)`. |
| BR-02 | **Chia sheet.** So khớp khung giá và slot sau trim, không phân biệt hoa thường. `≤2.5 tấn` vào nhóm chuyến. Mọi khung khác, kể cả `Pallet`, vào nhóm tấn. Trong nhóm chuyến, slot đúng `GST01_Vinh Tuong` vào `uni-clv`; slot đúng `GST01_CLV HP` vào `clv chuyến`. Slot trống vào `clv tấn` và `tn-aav-pa`, không vào `clv tấn (2)`. Không hard-code bốn số hóa đơn của kỳ mẫu. |
| BR-03 | **Khối chuyến.** Một chuyến là cùng số xe và cùng ngày hóa đơn. Dòng đầu chuyến ghi `5 nhà` = tổng `CLF` + `VFM` + `MCC` + `CLV` + `NDFC` + `GẠO` của dòng đó, và tổng trọng lượng chuyến. Dòng sau của chuyến để trống `5 nhà` và lặp lại cùng tổng trọng lượng chuyến. |
| BR-04 | **Tấn trên dòng hàng.** `Round(MT) = ROUND(HĐ trọng lượng net / 1000, 3)`. Tấn/hóa đơn: dòng đầu của cùng số hóa đơn = tổng `Round(MT)` của hóa đơn đó, dòng sau = 0. Tấn/chuyến: dòng đầu của chuyến = tổng `Round(MT)` của chuyến, dòng sau = 0. Bỏ các ô mẫu trỏ nhầm cột và các `SUM` theo khối viết tay. |
| BR-05 | **Tiền dòng hàng.** Sổ giá đúng tên `CLV`. Không fallback sang sổ khác. Khung đúng chữ `Pallet` lấy `pallet_trip_price`. Khung khác lấy đơn giá bậc tấn. Thiếu giá thì để trống. Phụ phí bốc xếp và chuyển tải tra `customer_surcharges`; thiếu thì để trống. Không có cột ghép điểm. Nhóm tấn: đơn giá = cước vận chuyển; thành tiền check = `ROUND(tấn/chuyến × (cước + bốc xếp + chuyển tải), 0)`; thành tiền sau hóa đơn = `ROUND(tấn/chuyến × cước, 0)`. Nhóm chuyến: đơn giá = cước + bốc xếp + chuyển tải; thành tiền check và thành tiền sau hóa đơn = `ROUND(đơn giá / tổng trọng lượng chuyến × tấn/chuyến, 0)`. Cột `THÀNH TIỀN HÓA ĐƠN` để trống. Chênh lệch = thành tiền sau hóa đơn − cột đó. Số tấn `#,##0.000`. Tiền `#,##0`. Ô text dạng `"1,200"` phải thành number trước khi ghi. |
| BR-06 | **Khách và tuyến.** Tra `lookupCustomer`, khớp địa chỉ như ND-MCC (chuẩn hóa, bỏ tiền tố thửa đất, chuỗi con, token overlap ≥ 75%), xếp tuyến bằng `rankRouteMatches`. Cột chèn, header dòng 2 để trống: đại lý, điểm giao thực tế, điểm tính phí, và công thức `điểm thực tế & ", (" & khung giá & "), xe " & số xe`. Khớp một phần tô `#FFEB9C` trên đại lý, điểm giao thực tế, điểm tính phí, địa chỉ giao hàng; note ô địa chỉ = địa chỉ khớp trong DB. Chỉ tô trên sáu sheet kết quả. |
| BR-07 | **SITE và khu vực.** Mọi dòng kết quả: `SITE` = `CLV`. `clv tấn`, `clv tấn (2)`, `tn-aav-pa`: khu vực `TỈNH`. `clv chuyến+uni-clv`, `clv chuyến`, `uni-clv`: khu vực `ST`. Không suy khu vực từ địa chỉ. |
| BR-08 | **Trang bìa.** Dòng 1–12 là phần đầu trang. Giữ nguyên chữ hợp đồng `WILMAR CLV-PHUPHAT/2025`, đơn vị bán, đơn vị mua, địa chỉ, mã số thuế, tài khoản như file `clv 1-8.7.xlsx`. Bốn chỗ theo kỳ để trống: tháng trong tiêu đề, số hóa đơn kèm theo, ngày hóa đơn, số bảng kê và ngày bảng kê. Dòng 13 là header. Từ dòng 14, mỗi hóa đơn một dòng, gộp dòng hàng. Dòng hóa đơn đầu của chuyến mang tấn/chuyến, tổng trọng lượng, đơn giá, phụ phí và thành tiền theo BR-05. Hóa đơn sau cùng chuyến chỉ ghi tấn/hóa đơn, định danh và `SITE` / khu vực. Sau mỗi chuyến một dòng `Tổng cộng` cộng các dòng hóa đơn của chuyến đó. `uni-clv` không có dòng `Tổng cộng`. STT tăng trên dòng hóa đơn. Dòng `Tổng cộng` không ghi STT và không chép số `48` của file mẫu. Cột `Số dòng trên HĐ` và `Điều chỉnh Hóa đơn` để trống. Trang bìa gọi cột chuyển tải là `Phụ phí giao hàng`; cùng một số với `PHÍ CHUYỂN TẢI` trên sheet dòng hàng. |
| BR-09 | **Workbook.** Giữ sheet tên `Sheet`, `Sheet1`, `Processed`, `CLV` (trim, đúng chữ), đúng thứ tự gốc tương đối. Xóa mọi sheet khác của file đợt. Ghi đè nếu tên đích đã tồn tại. Thêm cuối, đúng thứ tự: `clv tấn`, `clv tấn (2)`, `tn-aav-pa`, `clv chuyến+uni-clv`, `clv chuyến`, `uni-clv`. Với file 1–8.7 thứ tự cuối là `Sheet1`, `Processed`, `CLV`, rồi sáu sheet kết quả. |
| BR-10 | **Lỗi thiếu sheet.** HTTP 400, `success: false`, message `File input thiếu sheet CLV`, code `MISSING_CLV_SHEET`. Ô CLV = `failed`, `error_message` bằng message đó. |
| BR-11 | **Chạy lại.** Xóa object output cũ, ghi file mới, `status = ready`, xóa `error_message`. Giống chạy lại ND-MCC. |
| BR-12 | **Upload đợt.** Giữ kiểm tra hiện tại: `.xlsx`, tối đa 10 MB, phải có sheet `Processed`. |

---

## 4. API

Thêm `POST /api/bang-ke-tho/batches/:id/process-clv`. Quyền `accounting_data.manage` hoặc `ADMIN`. Download giữ `GET /api/bang-ke-tho/batches/:id/files/clv`.

Thành công 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "batch_id": "...",
    "house_code": "clv",
    "status": "ready",
    "download_filename": "clv 1-8.7.xlsx",
    "generated_at": "...",
    "stats": {
      "tan_rows": 93,
      "chuyen_rows": 67,
      "tan_invoices": 32,
      "chuyen_invoices": 30,
      "cover_tan_invoices": 28,
      "cover_tn_invoices": 4,
      "cover_chuyen_invoices": 23,
      "cover_uni_invoices": 7
    }
  }
}
```

Lỗi thiếu sheet:

```json
{
  "success": false,
  "message": "File input thiếu sheet CLV",
  "error": { "code": "MISSING_CLV_SHEET" }
}
```

---

## 5. UI

Ô `clv` dùng cùng trạng thái với ô ND-MCC: `pending` và `failed` hiện nút xử lý; `ready` hiện tải và chạy lại; đang chạy thì spinner; `failed` có tooltip `error_message`. Nhãn tiếng Việt và tiếng Anh riêng cho CLV. Ô `calofic` vẫn là badge tĩnh.

---

## 6. Acceptance criteria

| ID | Tiêu chí |
|---|---|
| AC-01 | File 1–8.7 ra đúng 9 sheet, đúng thứ tự BR-09. Không còn `VFM`, `MCC`, `NDFC`, `STHI`, `NPP`, `TINH`. `Sheet1`, `Processed`, `CLV` còn nguyên nội dung. |
| AC-02 | `clv tấn` 93 dòng hàng, `clv chuyến+uni-clv` 67 dòng hàng. Bốn hóa đơn slot trống chỉ ở `clv tấn` và `tn-aav-pa`. |
| AC-03 | `uni-clv` chỉ slot `GST01_Vinh Tuong`. `clv chuyến` chỉ slot `GST01_CLV HP`. `uni-clv` không có dòng `Tổng cộng`. Ba trang bìa kia có `Tổng cộng` sau mỗi chuyến. |
| AC-04 | Công thức tấn/hóa đơn, tấn/chuyến, thành tiền check và thành tiền sau hóa đơn đúng BR-04 và BR-05 trên dòng hàng và trên dòng hóa đơn đầu của trang bìa. |
| AC-05 | Sổ đích luôn `CLV`. Khung `Pallet` lấy giá chuyến pallet. Không fallback. Thiếu giá hoặc phụ phí thì ô trống. |
| AC-06 | Khớp một phần tô `#FFEB9C` và có note địa chỉ trên sáu sheet kết quả. |
| AC-07 | `SITE` = `CLV`. Khu vực `TỈNH` hoặc `ST` đúng BR-07. |
| AC-08 | Trang bìa giữ khối chữ cố định. Tháng, số hóa đơn, ngày và số bảng kê trống. Cột `THÀNH TIỀN HÓA ĐƠN` trống. |
| AC-09 | Thiếu sheet `CLV`: HTTP 400, code `MISSING_CLV_SHEET`, ô CLV `failed`. |
| AC-10 | Bấm xử lý trên UI chuyển CLV sang `ready` hoặc `failed`. `ready` tải được file. Calofic và ND-MCC không đổi hành vi. |
