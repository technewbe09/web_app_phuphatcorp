# Task List: Engine bảng kê thô CLV
**Ngày:** 2026-10-09  
**BA Doc:** `docs/ba/20261009_bang-ke-tho-clv-analysis.md`  
**Mục tiêu:** Sinh workbook CLV từ sheet `CLV` của file đợt, nối `POST /api/bang-ke-tho/batches/:id/process-clv`, và bật nút xử lý / tải / chạy lại trên ô `clv`. Không migration. Không đụng engine Calofic hay ND-MCC.

---

## ⚙️ BACKEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|---|---|---|---|
| BE-01 | Sổ giá CLV | Trong `pricingLookup.ts`, thêm hàm chọn sổ cho nhà CLV: luôn trả tên `CLV`, không gọi `resolveTargetBook`. `lookupTransportRate` khi `targetBook` là `CLV` chỉ nhận book đúng tên đó; book khác điểm 0. Khung đúng chữ `Pallet` lấy `pallet_trip_price`. Không thấy giá thì `null`. Giữ nguyên cách chấm điểm của ND-MCC. | S |
| BE-02 | Engine `clvEngine.ts` | Tạo `backend/src/services/bangKeTho/clvEngine.ts`, hàm `processClvWorkbook(inputBuffer) -> { buffer, stats }`. Tìm sheet `CLV` (trim, không phân biệt hoa thường). Thiếu thì throw `MISSING_CLV_SHEET`. Header dòng 2. Lọc mã `CLV`. Ngày hóa đơn dùng ngày lịch local. Chia dòng theo BR-02: khung `≤2.5 tấn` / còn lại; slot `GST01_CLV HP`, `GST01_Vinh Tuong`, slot trống. Tra khách, địa chỉ, tuyến, phụ phí bốc xếp và chuyển tải qua `pricingLookup`. Khớp một phần tô `#FFEB9C` và note địa chỉ. | L |
| BE-03 | Sheet dòng hàng | Ghi `clv tấn` và `clv chuyến+uni-clv` đúng cột file mẫu: chèn đại lý, điểm giao thực tế, điểm tính phí, công thức hóa đơn (header bốn cột này trống). Công thức BR-04 và BR-05. `5 nhà` và tổng trọng lượng chuyến ở dòng đầu chuyến; dòng sau lặp tổng trọng lượng, để trống `5 nhà`. `SITE` = `CLV`. Khu vực `TỈNH` trên `clv tấn`, `ST` trên `clv chuyến+uni-clv`. Số tấn `#,##0.000`, tiền `#,##0`. Ép ô số dạng text về number. | L |
| BE-04 | Bốn trang bìa | Ghi `clv tấn (2)`, `tn-aav-pa`, `clv chuyến`, `uni-clv`. Khối chữ dòng 1–12 lấy từ `clv 1-8.7.xlsx`; để trống tháng, số hóa đơn, ngày, số bảng kê. Một dòng mỗi hóa đơn. Dòng đầu chuyến mang tiền theo BR-05; hóa đơn sau cùng chuyến chỉ có tấn/hóa đơn. `Tổng cộng` sau mỗi chuyến, trừ `uni-clv`. STT tăng trên dòng hóa đơn. Cột chuyển tải trên bìa tiêu đề `Phụ phí giao hàng`. `THÀNH TIỀN HÓA ĐƠN` trống. | L |
| BE-05 | Ghép workbook | Giữ `Sheet`, `Sheet1`, `Processed`, `CLV` đúng thứ tự gốc. Xóa mọi sheet khác. Ghi đè tên đích nếu đã có. Nối cuối: `clv tấn`, `clv tấn (2)`, `tn-aav-pa`, `clv chuyến+uni-clv`, `clv chuyến`, `uni-clv`. Stats: `tan_rows`, `chuyen_rows`, `tan_invoices`, `chuyen_invoices`, `cover_tan_invoices`, `cover_tn_invoices`, `cover_chuyen_invoices`, `cover_uni_invoices`. | M |
| BE-06 | Nối service và route | `bangKeTho/index.ts`: `processClv` đọc `batches/{id}/input.xlsx`, gọi engine, upload `batches/{id}/outputs/clv.xlsx`, `ready` thì ghi `object_key`, `download_filename`, xóa `error_message`. `failed` ghi `error_message`. Map `MISSING_CLV_SHEET` sang HTTP 400, message `File input thiếu sheet CLV`. Chạy lại xóa object cũ như `processNdMcc`. Route `POST /batches/:id/process-clv`, quyền `accounting_data.manage`. | M |
| BE-07 | Test | `backend/src/__tests__/bangKeThoClvEngine.test.ts`. Assert thứ tự sheet và sheet bị xóa trên buffer giống `1-8.7.xlsx`. Đếm 93 / 67 dòng hàng và 28 / 4 / 23 / 7 hóa đơn bìa. Slot `GST01_Vinh Tuong` chỉ ở `uni-clv`. Công thức thành tiền nhóm tấn không chia tổng trọng lượng; nhóm chuyến có chia. `uni-clv` không có `Tổng cộng`. Thiếu sheet `CLV` throw `MISSING_CLV_SHEET`. Sổ đích `CLV`, không fallback. Một ca partial-match tô `#FFEB9C`. | M |

## 🎨 FRONTEND TASKS

| ID | Task | Chi tiết kỹ thuật | Effort |
|---|---|---|---|
| FE-01 | API và hook | `bangKeThoApi.ts`: `processClv(batchId)` gọi `POST /bang-ke-tho/batches/:id/process-clv`, kiểu trả về cùng envelope với `processNdMcc`, `house_code: 'clv'`. `useBangKeTho.ts`: `useProcessClv`. | S |
| FE-02 | Ô CLV | `BangKeThoHouseCell.tsx`: nhánh `clv` cùng trạng thái với `nd_mcc` (`pending` / `failed` nút xử lý, `ready` tải và chạy lại, spinner, tooltip lỗi). `calofic` vẫn badge. `BangKeThoPage.tsx` truyền mutation CLV riêng, không gọi nhầm `processNdMcc`. | M |
| FE-03 | i18n | `vi.json` và `en.json`: `bangKeTho.action.processClv`, `reprocessClv`, `downloadClv`, `bangKeTho.message.success.processClv`, `bangKeTho.message.error.processClv`. | S |

## 📊 Thứ tự thực hiện

Phase 3: BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06  
Phase 4: Không migration  
Phase 5: BE-07  
Phase 6: `npm run test` trong `backend`  
Phase 7: FE-01 → FE-02 → FE-03  
Phase 8: Regression AC-01…AC-10  
Phase 9: Cập nhật `.opencode/knowhow/know-how.md` và `system-features.md` khi engine đã nối API

## Coding Standards
Đọc `.opencode/knowhow/coding-convention.md` trước khi viết code. Envelope `{ success, message, data }` và lỗi `{ success: false, message, error: { code } }`. ExcelJS. Controller không chứa query.

## ⚠️ Lưu ý kỹ thuật
- `resolveTargetBook` là của MCC/NDFC. Nhà CLV không dùng hàm đó.
- Công thức mẫu không đồng nhất (ô trỏ cột `AV`, `SUM` theo khối). Engine chỉ ghi quy tắc BR-04.
- Trang bìa kỳ mẫu đã điền số hóa đơn `235` và bảng kê `05/CLV2026`. Engine để trống các chỗ đó.
- Dòng slot trống của kỳ 1–8.7 là `AV7`, `TN3`, `PA9`, `PA3`. Rule là slot trống, không phải bốn mã này.
- Ngày `DATE` và serial Excel lấy theo lịch local.
