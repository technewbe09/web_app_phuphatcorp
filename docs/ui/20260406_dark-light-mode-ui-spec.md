# UI Spec: Chức năng chuyển chế độ sáng/tối (Dark/Light Mode)

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_dark-light-mode-analysis.md
**Scope:** Frontend only

---

## Section 1 — User Journey

### Happy Path

```
1. User truy cập app (lần đầu) → theme = system preference (dark/light)
2. User nhìn thấy toggle button ở sidebar (MainLayout) hoặc góc phải trên (AuthLayout)
3. User click toggle → icon chuyển (Moon → Sun hoặc Sun → Moon) + toàn bộ giao diện đổi màu
4. User refresh page → theme vẫn giữ nguyên (persist qua localStorage)
```

### Alternative Paths

```
A1. User đã set dark trước → mở tab mới → tab mới tự load dark (localStorage shared)
A2. OS đang dark, user chưa toggle → app auto-dark; user toggle sang light → localStorage lưu 'light'
```

### Error Paths

```
E1. localStorage bị block (private mode) → app hoạt động bình thường trong session, theme không persist qua reload
```

---

## Section 2 — Screen Inventory

### Screen 1: ThemeToggle Button (reusable component)

**File:** `frontend/src/components/ui/ThemeToggle.tsx`

**Variants:**
| Variant | Dùng ở đâu | Size |
|---------|-----------|------|
| sidebar | MainLayout sidebar | icon 18px, button p-1.5 |
| header | AuthLayout top-right | icon 18px, button p-1.5 |

**States:**
| State | Hiển thị | Aria |
|-------|---------|------|
| Light mode active | Icon Moon (Lucide) | aria-label="Chuyển sang chế độ tối" |
| Dark mode active | Icon Sun (Lucide) | aria-label="Chuyển sang chế độ sáng" |
| Hover | bg-neutral-100 dark:bg-neutral-700 | — |

**Không có loading state** — toggle là synchronous.

---

### Screen 2: MainLayout với Dark Mode Support

**File:** `frontend/src/layouts/MainLayout.tsx`

**Layout (không thay đổi cấu trúc, chỉ thêm dark: variants):**

```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR (w-64)              │ MAIN CONTENT           │
│ dark:bg-neutral-900         │ dark:bg-neutral-950    │
│ dark:border-neutral-800     │                        │
│ ┌─────────────────────────┐ │                        │
│ │ Logo area               │ │                        │
│ │ dark:border-neutral-800 │ │                        │
│ └─────────────────────────┘ │                        │
│                             │                        │
│ Nav items                   │                        │
│ active: dark:bg-neutral-800 │                        │
│ hover:  dark:hover:bg-neutral-800│                   │
│                             │                        │
│ ┌─────────────────────────┐ │                        │
│ │ User info              [🌙]│                        │
│ │ dark:border-neutral-800 │ │                        │
│ └─────────────────────────┘ │                        │
└─────────────────────────────────────────────────────┘
```

**ThemeToggle placement:** Khu vực user info, kế bên avatar/logout button.

**Dark color mapping cho MainLayout:**

| Light | Dark |
|-------|------|
| `bg-neutral-50` (main) | `dark:bg-neutral-950` |
| `bg-white` (sidebar) | `dark:bg-neutral-900` |
| `border-neutral-200` | `dark:border-neutral-800` |
| `text-neutral-900` | `dark:text-neutral-100` |
| `text-neutral-600` | `dark:text-neutral-400` |
| `text-neutral-500` | `dark:text-neutral-500` |
| `bg-neutral-100` (active nav) | `dark:bg-neutral-800` |
| `hover:bg-neutral-50` | `dark:hover:bg-neutral-800` |
| `bg-neutral-200` (avatar) | `dark:bg-neutral-700` |
| `text-neutral-400` (logout) | `dark:text-neutral-500` |
| `hover:bg-neutral-100` (logout) | `dark:hover:bg-neutral-800` |

---

### Screen 3: AuthLayout với Dark Mode Support

**File:** `frontend/src/layouts/AuthLayout.tsx`

**Layout:**

```
┌──────────────────────────────────┐
│ dark:bg-neutral-950              │
│                            [🌙]  │  ← ThemeToggle top-right (absolute)
│                                  │
│         [Logo Icon]              │
│         PhuPhatCorp              │
│                                  │
│   ┌──────────────────────────┐   │
│   │  Login/Register Form     │   │
│   │  dark:bg-neutral-900     │   │
│   │  dark:border-neutral-800 │   │
│   └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

**ThemeToggle placement:** `absolute top-4 right-4`

**Dark color mapping cho AuthLayout:**

| Light | Dark |
|-------|------|
| `bg-neutral-50` (page bg) | `dark:bg-neutral-950` |
| Logo icon `bg-neutral-800` | giữ nguyên (đủ contrast trên cả 2 nền) |
| `text-neutral-900` (title) | `dark:text-neutral-100` |

---

### Screen 4: UI Components Dark Mode Support

Tất cả components trong `src/components/ui/` cần dark: variants:

**Button.tsx** — Thêm dark variants:
| Variant | Dark |
|---------|------|
| primary | `dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-100` |
| secondary | `dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600` |
| outline | `dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700` |
| ghost | `dark:text-neutral-300 dark:hover:bg-neutral-800` |

**Input.tsx** — Cần đọc và thêm dark styles.

**Card.tsx** — Cần đọc và thêm dark styles.

**Modal.tsx** — Cần đọc và thêm dark styles (backdrop + panel).

**Table.tsx** — Cần đọc và thêm dark styles.

**Select.tsx**, **Badge.tsx** — Cần đọc và thêm dark styles.

---

## Section 3 — Component Checklist

### ThemeToggle (mới tạo)
- [ ] Light mode state: icon Moon, aria-label phù hợp
- [ ] Dark mode state: icon Sun, aria-label phù hợp
- [ ] Hover state: bg subtle
- [ ] onClick: gọi `toggleTheme()` từ ThemeContext
- [ ] Không có loading state (sync operation)
- [ ] Accessible: aria-label thay đổi theo state

### ThemeContext (mới tạo)
- [ ] Đọc localStorage 'theme' khi mount
- [ ] Fallback về `prefers-color-scheme` nếu không có localStorage
- [ ] Apply/remove class 'dark' trên `document.documentElement`
- [ ] `toggleTheme()` function
- [ ] `theme` state ('light' | 'dark')
- [ ] Lưu vào localStorage khi toggle

### index.html anti-FOUC script
- [ ] Script inline trong `<head>` (trước CSS) chạy synchronously
- [ ] Đọc localStorage 'theme'
- [ ] Fallback prefers-color-scheme
- [ ] Set class 'dark' nếu cần

---

## Section 4 — Validation UX

**Không có form validation** — đây là toggle action.

Không cần toast/inline error cho tính năng này.

---

## Section 5 — i18n Keys

### vi.json — Thêm vào root:
```json
"theme": {
  "toggleToDark": "Chuyển sang chế độ tối",
  "toggleToLight": "Chuyển sang chế độ sáng",
  "dark": "Chế độ tối",
  "light": "Chế độ sáng"
}
```

### en.json — Thêm vào root:
```json
"theme": {
  "toggleToDark": "Switch to dark mode",
  "toggleToLight": "Switch to light mode",
  "dark": "Dark mode",
  "light": "Light mode"
}
```

---

## Section 6 — Web Design Guidelines Compliance

- **Accessibility:** aria-label trên toggle button thay đổi theo state hiện tại
- **Color contrast:** Neutral palette được chọn đảm bảo contrast ratio WCAG AA:
  - Light: text-neutral-900 trên bg-neutral-50 → 19.5:1 ✅
  - Dark: text-neutral-100 trên bg-neutral-900 → ~15:1 ✅
- **Focus visible:** Button có `focus:ring-2` từ base styles hiện tại
- **Motion:** Toggle không cần animation (giữ đơn giản), chỉ transition-colors cho smooth
- **Responsive:** Toggle button visible ở mọi breakpoint trong sidebar và AuthLayout
- **No hardcoded text:** Tất cả labels dùng i18n keys từ Section 5

---

## Section 7 — Files cần tạo/sửa

```
TẠO MỚI:
  frontend/src/contexts/ThemeContext.tsx         ← Provider + hook + localStorage logic
  frontend/src/components/ui/ThemeToggle.tsx     ← Toggle button component

CHỈNH SỬA:
  frontend/index.html                            ← Inline script anti-FOUC
  frontend/tailwind.config.js                    ← darkMode: 'class'
  frontend/src/App.tsx                           ← Wrap với ThemeProvider
  frontend/src/layouts/MainLayout.tsx            ← dark: variants + ThemeToggle
  frontend/src/layouts/AuthLayout.tsx            ← dark: variants + ThemeToggle
  frontend/src/components/ui/Button.tsx          ← dark: variants
  frontend/src/components/ui/Input.tsx           ← dark: variants
  frontend/src/components/ui/Card.tsx            ← dark: variants
  frontend/src/components/ui/Modal.tsx           ← dark: variants
  frontend/src/components/ui/Table.tsx           ← dark: variants
  frontend/src/components/ui/Select.tsx          ← dark: variants
  frontend/src/components/ui/Badge.tsx           ← dark: variants
  frontend/src/i18n/vi.json                      ← Thêm theme keys
  frontend/src/i18n/en.json                      ← Thêm theme keys
```
