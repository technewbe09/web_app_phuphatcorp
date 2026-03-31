---
name: change-request
description: Workflow xử lý thay đổi trên feature đang có cho PhuPhatCorp Web.
  Invoke khi user muốn sửa business logic, thêm field, đổi UI/UX, hoặc đổi API
  contract của feature đã implement. KHÔNG dùng cho feature mới (dùng feature-dev)
  hoặc bug (dùng bug-fix). Workflow tự đánh giá impact size và chọn đường đi phù hợp.
disable-model-invocation: true
---

# Workflow: Change Request
# PhuPhatCorp Web — Assess → Plan → Implement → Verify → Update docs

## Tổng quan

```
User mô tả thay đổi mong muốn
            ↓
[PHASE 1] Impact Assessment    → đánh giá phạm vi, phân loại S/M/L
            ↓ ✋ dừng confirm
          ┌─────────────────────────────────────┐
          │ SMALL        │ MEDIUM / LARGE        │
          │ (2-5 files,  │ (migration, sửa BE+FE,│
          │ không migration)│ đổi API contract)   │
          ↓              ↓                       │
          │         [PHASE 2] Change Plan         │
          │              ↓ ✋ dừng confirm        │
          └──────────────┼───────────────────────┘
            ↓            ↓
[PHASE 3] Implement        → sửa code theo plan (hoặc trực tiếp nếu SMALL)
            ↓ tự động
[PHASE 4] Verify            → lint + test + regression
            ↓ tự động
[PHASE 5] Update docs       → cập nhật knowhow nếu cần
            ↓ tự động
         Báo cáo kết quả
```

**SMALL:** Dừng 1 lần (Phase 1) → implement luôn → verify → docs
**MEDIUM/LARGE:** Dừng 2 lần (Phase 1 + Phase 2) → implement → verify → docs
**Escape hatch:** Test fail sau 3 lần thử → revert và báo cáo user

---

## PHASE 1 — Impact Assessment

### Input
Nhận mô tả thay đổi từ user. Nếu chưa rõ, hỏi tối đa 2 câu:
- "Thay đổi ở feature/chức năng nào?"
- "Kết quả mong muốn khác gì so với hiện tại?"

### Thực hiện

**Bước 0 — Đọc context**
- `.claude/knowhow/know-how.md` → schema, endpoints, structure hiện tại
- `.claude/knowhow/system-features.md` → business logic, flow hiện tại của feature liên quan
- `.claude/knowhow/lessons-learned.md` → thay đổi tương tự đã gặp vấn đề gì chưa

**Bước 1 — Xác định loại thay đổi**

| Loại | Ví dụ |
|------|-------|
| Business logic | Sửa validation rule, đổi flow tính toán, thêm điều kiện |
| Data model | Thêm column, đổi type, thêm table mới |
| API contract | Thêm field vào request/response, đổi endpoint |
| UI/UX | Đổi layout, thêm filter/sort, thêm column vào table |
| Phối hợp | Nhiều loại cùng lúc (phổ biến nhất) |

**Bước 2 — Đánh giá impact size**

```
SMALL — Tất cả đều đúng:
  ✓ Không cần migration
  ✓ Sửa ≤ 5 files
  ✓ Không đổi API contract (request/response format giữ nguyên)
  ✓ Không ảnh hưởng feature khác

MEDIUM — Bất kỳ điều nào đúng:
  • Cần migration (thêm column, đổi type)
  • Sửa 6-10 files
  • Đổi API contract nhưng không break existing clients
  • Ảnh hưởng 1-2 feature khác

LARGE — Bất kỳ điều nào đúng:
  • Đổi cấu trúc table (rename, split, merge)
  • Sửa > 10 files
  • Break existing API contract (cần FE update đồng bộ)
  • Ảnh hưởng ≥ 3 features
  → Nếu LARGE quá phức tạp, khuyến nghị user dùng feature-dev workflow
```

**Bước 3 — Liệt kê files bị ảnh hưởng**

Trace từ thay đổi ra tất cả files cần sửa:
```
Trực tiếp:  [files cần sửa code]
Gián tiếp:  [files có thể bị ảnh hưởng, cần kiểm tra]
Không đụng: [files tuyệt đối không sửa]
```

### Checkpoint ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PHASE 1 HOÀN TẤT — Impact Assessment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thay đổi:    [Mô tả ngắn gọn]
Loại:        [Business logic / Data model / API / UI / Phối hợp]
Impact:      [SMALL / MEDIUM / LARGE]
Files:       [số lượng] files trực tiếp, [số] files gián tiếp
Migration:   [Có / Không]
Feature ảnh hưởng: [danh sách]

Bạn có muốn:
A) Tiếp tục [→ implement luôn nếu SMALL, → lên plan nếu MEDIUM/LARGE]
B) Điều chỉnh scope
C) Dừng tại đây
D) Chuyển sang feature-dev (nếu quá phức tạp)
```

---

## PHASE 2 — Change Plan (chỉ MEDIUM / LARGE)

> **SMALL skip phase này** — đi thẳng Phase 3.

### Thực hiện

Đọc code hiện tại của tất cả files trong scope, lên plan cụ thể:

```markdown
### Change Plan: [Tên thay đổi]
**Feature:** [Tên feature bị ảnh hưởng]
**Impact:** MEDIUM / LARGE

| Bước | Thay đổi | File | Layer |
|------|----------|------|-------|
| CR-01 | [vd: Thêm column `discount_rate` vào sku_factory_master] | migration | DB |
| CR-02 | [vd: Cập nhật service để tính discount] | services/skuService.ts | BE |
| CR-03 | [vd: Thêm field vào Zod schema] | validators/skuSchema.ts | BE |
| CR-04 | [vd: Cập nhật response include discount_rate] | controllers/skuController.ts | BE |
| CR-05 | [vd: Thêm column vào table UI] | pages/SkuList.tsx | FE |

**Thứ tự:** Migration → BE (service → validation → controller → route) → FE
**Không thay đổi:** [Những gì nằm ngoài scope]
**Backward compatibility:** [API cũ còn hoạt động không? FE cũ break không?]
```

### Checkpoint ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 PHASE 2 HOÀN TẤT — Change Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tổng: [X] bước thay đổi
Thứ tự: [Migration →] BE → FE

Bạn có muốn:
A) Bắt đầu implement (tự động đến khi xong)
B) Điều chỉnh plan
C) Dừng tại đây
```

---

## PHASE 3 — Implement

### Thực hiện tự động

**Nếu SMALL:** Implement trực tiếp dựa trên assessment từ Phase 1.
**Nếu MEDIUM/LARGE:** Implement tuần tự theo plan từ Phase 2.

Dùng skill phù hợp:
- Thay đổi DB → skill `dev-backend` (migration pattern)
- Thay đổi BE → skill `dev-backend` (service/controller/route pattern)
- Thay đổi FE → skill `dev-frontend`

**Thứ tự bắt buộc:**
1. Migration (nếu có) → chạy `npm run migrate`
2. Backend (service → validation → controller → route)
3. Frontend (hook → page → component → i18n)

**Sau mỗi layer:**
```bash
# Sau khi sửa BE
cd backend && npm run lint && npm run build

# Sau khi sửa FE
cd frontend && npm run lint && npm run typecheck
```

Nếu lint/build fail → fix trước khi chuyển layer tiếp.

**Quy tắc khi implement:**
- Chỉ sửa trong scope đã xác định ở Phase 1
- Nếu phát hiện cần sửa thêm ngoài scope → dừng, hỏi user
- Giữ backward compatibility nếu có thể
- Tuân thủ `.claude/knowhow/coding_convention.md`

---

## PHASE 4 — Verify

### Thực hiện tự động

**Bước 1 — Chạy test suite**
```bash
cd backend && npm run test
cd frontend && npm run test
```

**Bước 2 — Viết/cập nhật test cho thay đổi**

Nếu thay đổi business logic hoặc API contract → viết test mới hoặc cập nhật test cũ:
```typescript
describe('Change: [Mô tả thay đổi]', () => {
  it('should [behavior mới] when [điều kiện]', async () => {
    // Given → setup
    // When  → action
    // Then  → verify behavior mới
  });
});
```

**Bước 3 — Chạy lại toàn bộ**
```bash
cd backend && npm run lint && npm run build && npm run test
cd frontend && npm run lint && npm run typecheck && npm run test
```

**Nếu test fail:**
- Lần 1: Đọc error, fix
- Lần 2: Kiểm tra có break feature khác không
- Lần 3: Revert thay đổi, báo cáo user chi tiết và **dừng workflow**

---

## PHASE 5 — Update Docs

### Thực hiện tự động

Cập nhật tùy theo loại thay đổi:

| Thay đổi gì | Cập nhật file |
|-------------|---------------|
| Thêm/sửa column, table | `know-how.md` (schema section) |
| Thêm/sửa endpoint, đổi API contract | `know-how.md` (endpoints section) |
| Đổi business logic, flow, validation rule | `system-features.md` |
| Đổi role access | `system-features.md` |
| Phát hiện pattern/anti-pattern | `lessons-learned.md` |
| Quyết định kỹ thuật đáng ghi nhận | `decisions.md` |

---

## Báo cáo cuối

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CHANGE REQUEST HOÀN TẤT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thay đổi:   [Mô tả ngắn]
Impact:     [SMALL / MEDIUM / LARGE]
Files đã sửa:
  - [file 1]: [thay đổi gì]
  - [file 2]: [thay đổi gì]
Migration:  [Có — tên file / Không]
Tests:      [X] pass, [X] mới/cập nhật
Docs:       [files đã cập nhật]

→ Nhớ commit với message: change([scope]): [mô tả ngắn]
```

---

## Quy tắc bất biến

- **KHÔNG sửa ngoài scope** đã xác định ở Phase 1 mà không hỏi user
- **KHÔNG skip verify** — mọi change đều phải qua lint + test
- **Thứ tự bắt buộc:** Migration → BE → FE (không làm ngược)
- **SMALL không cần plan** nhưng vẫn cần assessment và verify
- **Escape hatch:** Test fail 3 lần → revert, báo cáo user, dừng
- **Quá phức tạp?** → khuyến nghị user chuyển sang feature-dev workflow
- **Phát hiện bug trong lúc sửa?** → ghi note, dùng bug-fix workflow sau, không fix trong change request