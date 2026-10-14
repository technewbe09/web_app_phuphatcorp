---
name: feature-dev
description: Workflow phát triển tính năng mới — tự động phát hiện scope (FULL/LIGHT), điều phối BA → UI Spec → Tech Lead → Backend → QA → Frontend. Gọi skill này khi cần phát triển tính năng mới.
---

# Feature Dev Workflow

Khi skill này được load, bạn tuân thủ workflow bên dưới. Bạn phát hiện scope → gọi skill → dừng đúng checkpoint → user confirm xong thì chạy tự động.

## Quy tắc quan trọng

1. **Đến checkpoint ✋ → output báo cáo và DỪNG NGAY, đợi user.**
2. **Chỉ chạy phase sau checkpoint khi user đã chọn "A".**

---

## Scope Detection (chạy đầu tiên)

Nếu **tất cả** đúng → LIGHT, ngược lại → FULL:

| # | Tiêu chí LIGHT |
|---|---------------|
| 1 | Không tạo table/column mới |
| 2 | Không đổi business rules cốt lõi |
| 3 | Không thêm role/permission |
| 4 | Không thêm API endpoint mới |
| 5 | ≤ 2 screen/modal ảnh hưởng |
| 6 | Không cần migration |

Thông báo: `📋 SCOPE: [FULL/LIGHT] — [lý do 1 dòng]`

---

## FULL MODE

```
Phase 1:   BA Analysis     → skill business-analyst
Phase 1.5: UI/UX Design    → skill ui-ux-design
           ✋ DỪNG — user confirm BA + UI Spec
Phase 2:   Tech Lead       → skill tech-lead
           ✋ DỪNG — user confirm task list
Phase 3-10: Implement → Migration → QA → Frontend → Regression → Docs (tự động)
```

### Phase 1 — BA Analysis

Gọi `skill({name: "business-analyst"})`. Output: `docs/ba/YYYYMMDD_[feature]-analysis.md`

### Phase 1.5 — UI/UX Design

Gọi `skill({name: "ui-ux-design"})`. Output: `docs/ui/YYYYMMDD_[feature]-ui-spec.md`

### Checkpoint 1 ✋ — DỪNG

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE 1 + 1.5 HOÀN TẤT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 BA: docs/ba/YYYYMMDD_[feature]-analysis.md
🎨 UI: docs/ui/YYYYMMDD_[feature]-ui-spec.md
Screens: [N] | Components: [N]

A) Tiếp tục — Tech Lead lên tasks
B) Chỉnh sửa BA/UI Spec
C) Dừng
```

### Phase 2 — Tech Lead

Gọi `skill({name: "tech-lead"})`. Output: `docs/tasks/YYYYMMDD_[feature]-tasks.md`

### Checkpoint 2 ✋ — DỪNG

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PHASE 2 — Task List
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 docs/tasks/YYYYMMDD_[feature]-tasks.md
BE: [N] tasks | FE: [N] tasks

A) Bắt đầu implement (tự động hết)
B) Điều chỉnh
C) Dừng
```

> User chọn A → Phase 3-10 chạy tự động.

### Phase 3-10 (tự động)

3. Backend: `skill({name: "dev-backend"})` → lint + build sau mỗi task
4. Migration: `npm run db:push`
5. QA viết test: `skill({name: "test-qa"})`
6. QA chạy test: `npm run test` (3 lần fail → dừng)
7. Frontend: `skill({name: "dev-frontend"})` — **đọc UI Spec trước**
8. QA regression: `skill({name: "test-qa"})` — đối chiếu UI Spec
9. Update `know-how.md` nếu schema/API mới
10. Update `system-features.md`

---

## LIGHT MODE

```
Phase L1: BA + UI gọn → 1 file brief
          ✋ DỪNG
Phase L2: Tech Lead gọn → task list ngắn
          ✋ DỪNG
Phase L3-L4: Implement → QA gọn (tự động)
```

### Phase L1

Tự làm, 1 file brief gồm: tóm tắt, files ảnh hưởng, UI notes, rủi ro.
Lưu: `docs/light/YYYYMMDD_[feature]-brief.md`

### Phase L2

Task list gộp BE+FE, ID L-01, L-02...
Lưu: `docs/light/YYYYMMDD_[feature]-tasks.md`

### Checkpoint LIGHT ✋

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PLAN HOÀN TẤT (LIGHT): [Tên feature]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 docs/light/YYYYMMDD_[feature]-brief.md
📋 docs/light/YYYYMMDD_[feature]-tasks.md
[N] tasks

A) Bắt đầu implement
B) Điều chỉnh
C) Dừng
```

### Phase L3-L4 (tự động)

Implement tuần tự → chạy test có sẵn → check UI cơ bản. 2 lần fail → dừng.

---

## Quy tắc

- Scope detection tự động, user override được
- KHÔNG để dev-frontend tự quyết layout — phải đọc UI Spec/brief
- FULL: 2 checkpoint, LIGHT: 2 checkpoint
- 3 lần fail (FULL) / 2 lần (LIGHT) → báo cáo, dừng
- Gọi skill, không tự implement
