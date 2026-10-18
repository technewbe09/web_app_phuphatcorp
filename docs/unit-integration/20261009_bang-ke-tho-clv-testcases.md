# Test cases: Engine bảng kê thô CLV

**Ngày:** 2026-10-09  
**BA:** `docs/ba/20261009_bang-ke-tho-clv-analysis.md`  
**File test:** `backend/src/__tests__/bangKeThoClvEngine.test.ts`

| ID | Case | Kỳ vọng |
|---|---|---|
| TC-01 | `resolveClvBook` và `lookupTransportRate` với `targetBook = CLV` khi cùng tuyến có sổ `MCC GH` | Giá lấy từ sổ `CLV` |
| TC-02 | Workbook không có sheet `CLV` | Throw `MISSING_CLV_SHEET` |
| TC-03 | File có `Sheet1`, `Processed`, `VFM`, `CLV`, `NDFC` | Giữ 3 sheet đầu tiên của nhóm giữ, xóa `VFM`/`NDFC`, nối 6 sheet kết quả |
| TC-04 | 4 dòng tấn (gồm slot trống) và 2 dòng `≤2.5 tấn` | Stats 4/2 dòng, 3/2 hóa đơn, bìa 2/1/1/1 |
| TC-05 | Công thức thành tiền | Nhóm tấn nhân `Y * SUM(AB:AD)`. Nhóm chuyến chia `$Z` |
| TC-06 | Ô net `"1,200"` | Ghi number `1200` |
| TC-07 | Trang bìa | Không chứa số `235`. `BK số:` trống. `Tổng cộng` sau chuyến. `uni-clv` không có `Tổng cộng` |
| TC-08 | Khớp khách một phần | Tô `#FFEB9C`, note đúng địa chỉ DB |
| TC-09 | `processClv` thiếu sheet | HTTP-level `BangKeError` 400, `error_message` tiếng Việt |
