# BA Analysis: Delivery Data Processing Feature
**Ngày:** 2026-03-31
**Feature:** Xử lý dữ liệu giao hàng (Delivery Data Processing)

---

## 1.1 Flowchart TO-BE

```mermaid
flowchart TD
  A[User mở trang Xử lý Data Giao Hàng] --> B[Upload file .xlsx]
  B --> C{File hợp lệ?}
  C -- Không --> D[Hiển thị lỗi: chỉ nhận .xlsx]
  C -- Có --> E[Đọc file Excel trong browser\nbằng thư viện xlsx]
  E --> F[Bỏ qua 4 dòng đầu\nhàng 5 = header, hàng 6+ = data]
  F --> G[Lọc bỏ các dòng trống]
  G --> H[Nhóm theo Số tàu/xe + Ngày hóa đơn]
  H --> I[Trong mỗi nhóm: sắp xếp\nSố hóa đơn tăng dần]
  I --> J[Sắp xếp các nhóm theo\nNgày HĐ ASC → Số tàu ASC]
  J --> K[Tính Round(MT) cho từng nhóm\n= SUM(HĐ-Trọng lượng Net) / 1000\nlàm tròn 3 chữ số thập phân]
  K --> L[Tạo output Excel với\n24 cột theo chuẩn]
  L --> M[Thêm dòng trống ngăn cách\ngiữa các nhóm]
  M --> N[Hiển thị kết quả:\n- Số dòng xử lý\n- Số nhóm\n- Khoảng ngày]
  N --> O[User tải xuống file output]
```

---

## 1.2 Business Rules

```
BR-001: Chỉ chấp nhận file .xlsx
BR-002: File phải có ít nhất 5 dòng (4 dòng header + 1 dòng data)
BR-003: Bỏ qua 4 dòng đầu (dòng 1: tên công ty, dòng 2: địa chỉ, dòng 3: tiêu đề, dòng 4: blank/sub-header), dòng 5 là header thực sự
BR-004: Nhóm dữ liệu theo key = (Số tàu/xe + Ngày hóa đơn), không phân biệt hoa thường khi so sánh
BR-005: Trong mỗi nhóm, sắp xếp Số hóa đơn tăng dần (numeric-aware sort)
BR-006: Các nhóm được sắp xếp: Ngày HĐ ASC trước, sau đó Số tàu/xe ASC
BR-007: Round(MT) = SUM(cột HĐ-Trọng lượng Net của tất cả dòng trong nhóm) / 1000, làm tròn 3 chữ số thập phân
BR-008: Round(MT) giống nhau cho tất cả các dòng trong cùng 1 nhóm
BR-009: Mỗi nhóm cách nhau 1 dòng trống (không chứa dữ liệu)
BR-010: Dòng trống cuối cùng (sau nhóm cuối) KHÔNG thêm
BR-011: Ngày hóa đơn trong output phải ở dạng DD/MM/YYYY
BR-012: Xử lý hoàn toàn trong browser, không gửi dữ liệu lên server
```

---

## 1.3 Data Model (Mapping từ Source → Output)

Không cần DB. Dữ liệu được xử lý trong memory của browser.

### Source File Structure
- **Sheet:** Sheet đầu tiên của file
- **Rows 1-4:** Header metadata (công ty, địa chỉ, tiêu đề, blank)  
- **Row 5:** Header thực sự (tên cột)
- **Row 6+:** Data

### Source Column Index Mapping
| Index | Field name | Mô tả |
|-------|-----------|--------|
| 0 | CHANNEL | Channel |
| 1 | SUB_CHANNEL | SubChannel |
| 2 | DIEN_GIAI_CT | Diễn giải chi tiết |
| 3 | DIEN_GIAI | Diễn giải |
| 4 | SLOT | Slot |
| 5 | WAYBILL_NO | Waybill No |
| 6 | SLOT_NO | SlotNo |
| 7 | USER_TAO_HD | User tạo HĐ |
| 8 | USER_TAO_PXK | User tạo PXK |
| 9 | PO_NUMBER | PO Number |
| 10 | WAREHOUSE_NO | Warehouse No |
| 11 | WAREHOUSE_NAME | Warehouse Name |
| 12 | MA_PXK | Phiếu XK |
| 13 | SO_CHUNG_TU | Chứng từ ghi sổ |
| 14 | SO_SERI | Số seri |
| 15 | DIA_CHI | Địa chỉ giao hàng |
| 16 | TEN_HANG_HOA | Tên hàng hóa |
| 17 | MA_DVT | Mã ĐVT |
| 18 | SP_TRONG_LUONG | SP Trọng lượng Net |
| 19 | HD_TRONG_LUONG | **HĐ Trọng lượng Net** ← dùng tính Round(MT) |
| 20 | MA_NCC | Mã nhà cung cấp |
| 21 | MA_KH | Mã khách hàng |
| 22 | TEN_KH | Tên khách hàng |
| 23 | MA_HANG | Mã hàng hóa |
| 24 | TEN_HANG_EN | Tên hàng hóa (EN) |
| 25 | LOAI_HANG | Loại hàng |
| 26 | MA_LH_GIAO | Mã liên hệ giao hàng |
| 27 | SO_LUONG | Số lượng |
| 28 | **SO_TAU_XE** | **Số tàu/xe ← Group key** |
| 29 | TAI_XE | Tài xế |
| 30 | SO_CONT | Số Cont |
| 31 | **NGAY_HD** | **Ngày hóa đơn ← Group key** |
| 32 | **SO_HD** | **Số hóa đơn ← Sort key** |
| 33 | THONG_TIN_BS | Thông tin bổ sung |

### Output Columns (24 cột)
| # | Tên cột | Nguồn |
|---|---------|--------|
| 1 | Mã nhà cung cấp | col 20 |
| 2 | Số hóa đơn | col 32 |
| 3 | Ngày hóa đơn | col 31 → format DD/MM/YYYY |
| 4 | Số tàu | col 28 |
| 5 | Mã khách hàng | col 21 |
| 6 | Tên khách hàng | col 22 |
| 7 | Địa chỉ giao hàng | col 15 |
| 8 | Round(MT) | Tính theo nhóm |
| 9 | Tài xế | col 29 |
| 10 | Thông tin bổ sung | col 33 |
| 11 | Slot | col 4 |
| 12 | Diễn giải | col 3 |
| 13 | Channel | col 0 |
| 14 | SubChannel | col 1 |
| 15 | SlotNo | col 6 |
| 16 | User tạo HĐ | col 7 |
| 17 | User tạo PXK | col 8 |
| 18 | PO Number | col 9 |
| 19 | Warehouse No | col 10 |
| 20 | Warehouse Name | col 11 |
| 21 | Phiếu XK | col 12 |
| 22 | Chứng từ ghi sổ | col 13 |
| 23 | Số seri | col 14 |
| 24 | Loại hàng | col 25 |

---

## 1.4 API Contract

Không có API backend. Xử lý hoàn toàn client-side.

```
processDeliveryData(file: File) → Promise<ProcessResult>

ProcessResult: {
  processedRows: number,       // Số dòng data đã xử lý
  groupCount: number,          // Số nhóm (tàu xe + ngày)
  dateRange: { from: string, to: string },  // DD/MM/YYYY
  warnings: string[],          // Cảnh báo (dòng thiếu data, v.v.)
  outputBlob: Blob,            // File Excel đã xử lý để download
  outputFilename: string,      // Tên file output
}
```

---

## 1.5 UI Screens cần thiết

```
- Screen 1: Trang Xử lý Data Giao Hàng → src/pages/admin/DeliveryDataPage.tsx
  + Trạng thái idle: Upload zone (drag-drop hoặc click)
  + Trạng thái processing: Loading spinner
  + Trạng thái success: Summary card + Download button
  + Trạng thái error: Error message
```

---

## 1.6 Edge Cases

```
- File không đúng format (thiếu cột, sai vị trí) → Hiển thị warning, tiếp tục xử lý với dữ liệu có được
- Cột HĐ-Trọng lượng Net là text/empty → Treat as 0 trong tính toán
- Ngày HĐ là Excel serial number → Convert sang DD/MM/YYYY
- Ngày HĐ là text string (đã ở dạng DD/MM/YYYY hoặc format khác) → giữ nguyên hoặc parse
- Số tàu/xe rỗng → Group key là empty string, vẫn xử lý bình thường
- File không có dữ liệu (tất cả dòng trống) → Thông báo lỗi: "File không chứa dữ liệu"
- File có rất nhiều dòng (>10,000) → Xử lý bình thường, XLSX handle được trong browser
- Số hóa đơn có chữ và số (ví dụ: "HD0001") → Sort numeric-aware (localeCompare)
```

---

## 1.7 Technical Approach

- **Xử lý trong browser:** Sử dụng thư viện `xlsx` (đã có trong devDependencies dạng `xlsx: ^0.18.5`)
- **Không cần backend endpoint mới:** Toàn bộ logic xử lý chạy trong browser
- **Tái sử dụng UI pattern:** Dùng cùng pattern với `ExecuteDataPage.tsx` (upload zone, result card, download)
- **Route mới:** `/admin/delivery-data` 
- **Sidebar entry:** Thêm vào DashboardLayout navItems
- **i18n:** Thêm keys mới vào `vi.json` và `en.json`
