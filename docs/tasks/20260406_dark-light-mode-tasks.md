# Task List: Dark/Light Mode Toggle

**Ngày:** 2026-04-06
**BA Doc:** docs/ba/20260406_dark-light-mode-analysis.md
**UI Spec:** docs/ui/20260406_dark-light-mode-ui-spec.md

---

## ⚙️ BACKEND TASKS

**Không có** — đây là tính năng pure frontend. Không cần migration, service, hay API route.

---

## 🎨 FRONTEND TASKS

| ID    | Task | Chi tiết kỹ thuật | UI Spec ref | Effort |
|-------|------|--------------------|-------------|--------|
| FE-01 | Tailwind dark mode config | Thêm `darkMode: 'class'` vào `tailwind.config.js` | — | S |
| FE-02 | Anti-FOUC script | Thêm inline script trong `<head>` của `index.html` để set class 'dark' synchronously trước React mount | Section 3 | S |
| FE-03 | ThemeContext | Tạo `src/contexts/ThemeContext.tsx`: state, toggle, localStorage persistence, prefers-color-scheme fallback | Section 3 | S |
| FE-04 | ThemeToggle component | Tạo `src/components/ui/ThemeToggle.tsx`: Moon/Sun icon, aria-label theo state | Section 2/Screen 1 | S |
| FE-05 | Wrap App với ThemeProvider | Sửa `src/App.tsx` thêm `<ThemeProvider>` bọc ngoài các provider khác | — | S |
| FE-06 | MainLayout dark support | Thêm `dark:` variants vào tất cả colors + gắn `<ThemeToggle>` vào sidebar | Section 2/Screen 2 | M |
| FE-07 | AuthLayout dark support | Thêm `dark:` variants + gắn `<ThemeToggle>` absolute top-right | Section 2/Screen 3 | S |
| FE-08 | UI Components dark support | Thêm `dark:` variants vào Button, Input, Card, Modal, Table, Select, Badge | Section 2/Screen 4 | M |
| FE-09 | i18n keys | Thêm `"theme"` object vào `vi.json` và `en.json` | Section 5 | S |

## 📊 Thứ tự thực hiện

FE-01 → FE-02 → FE-03 → FE-04 → FE-05 → FE-06 → FE-07 → FE-08 → FE-09

## ⚠️ Lưu ý kỹ thuật

- `ThemeProvider` phải bọc **ngoài cùng** trong App.tsx (trước AuthProvider) để context sẵn sàng khi AuthLayout cần
- Anti-FOUC script phải là **inline script** (không async/defer) trong `<head>` trước CSS
- Tất cả Tailwind dark classes phải được safelist nếu dùng dynamic class — nhưng vì dùng static string trong JSX, Tailwind content scanner sẽ tự detect
- `document.documentElement.classList` là cách đúng để toggle Tailwind dark mode class
- Khi test: inspect `<html>` element — class `dark` phải xuất hiện/mất khi toggle
