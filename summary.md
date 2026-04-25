# 📌 TÓM TẮT NGẮN GỌN

## ✅ CÂU TRẢ LỜI TRỰC TIẾP

### 1. **Access token được lưu ở đâu và gửi như thế nào?**
- **Lưu tại:** `localStorage` key `'access_token'` (line: AuthContext.tsx:50)
- **Gửi như:** Request interceptor đọc từ localStorage → gắn vào header `Authorization: Bearer <token>`

### 2. **Refresh token được lưu ở đâu?**
- **Lưu tại:** `httpOnly cookie` tên `'refreshToken'` (line: authController.ts:31-37)
- **Không ở:** localStorage (dòng 21 `removeItem('refresh_token')` là thừa)
- **Bảo mật:** ✅ Không bị XSS steal vì httpOnly flag

### 3. **Có interceptor gọi /refresh khi 401 không?**
- **Trả lời:** ❌ **KHÔNG CÓ**
- **File:** `frontend/src/api/axiosClient.ts` line 19-23
- **Hiện tại:** Chỉ clear token + redirect login
- **Seharusnya:** Gọi POST /auth/refresh → retry request

### 4. **Logic retry sau refresh có đúng không?**
- **Trả lời:** ❌ **KHÔNG CÓ LOGIC NÀY**
- Vì không có refresh call → không có retry

### 5. **Khi token hết hạn thì xử lý thế nào?**
- **Timeline:**
  - T=15m: Access token hết hạn
  - T=15m+: User call API → 401
  - Frontend: Clear token + redirect login
  - **RESULT:** User logout ngay, refresh token bị lãng quên ❌

---

## 🚨 VẤN ĐỀ CRITICAL

| # | Vấn Đề | Severity | File | Line |
|----|--------|----------|------|------|
| 1 | **No auto-refresh on 401** | 🔴 Critical | axiosClient.ts | 19-23 |
| 2 | **Access token in localStorage** | 🟠 High | axiosClient.ts + AuthContext.tsx | 9, 50 |
| 3 | **Race condition in auth middleware** | 🟠 High | auth.ts | 41-59 |
| 4 | **No request retry logic** | 🟠 High | axiosClient.ts | 19-26 |

---

## 📊 QUICK STATS

```
Token Security:
  ✅ Refresh token: httpOnly cookie (SECURE)
  ❌ Access token: localStorage (INSECURE)
  
Token Expiry:
  ✅ Access: 15 phút (good)
  ⚠️ Refresh: 7 ngày (ok but no blacklist)
  
Auto-Refresh:
  ❌ Khi 401: redirect login
  ❌ Không thử refresh
  ❌ Refresh token never used
  
UX Impact:
  ❌ Session expires every 15 minutes
  ❌ User must login repeatedly
```

---

## 🔧 PRIORITY FIX LIST

### 1️⃣ MUST FIX (Block production release)
- Implement response interceptor with refresh retry logic
- Move access_token to in-memory storage

### 2️⃣ SHOULD FIX (Do before launch)  
- Fix auth middleware race condition
- Add refresh token endpoint to frontend API

### 3️⃣ NICE TO HAVE
- Add offline support
- Implement token refresh before expiry (proactive refresh)
- Add refresh token blacklist

