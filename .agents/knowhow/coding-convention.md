## Coding Conventions — PhuPhatCorp

### Đặt tên (Naming)

```ts
// Files & folders: camelCase
authService.ts
authMiddleware.ts
userRoutes.ts

// Components (React): PascalCase
LoginPage.tsx
MainLayout.tsx
ProtectedRoute.tsx

// TypeScript types/interfaces: PascalCase
interface UserPublic {}
type LoginRequest = {}

// Functions, variables: camelCase
const userId = req.params.id;
const getById = async (id: number) => {};

// Constants / Env vars: UPPER_SNAKE_CASE
const JWT_SECRET = process.env.JWT_SECRET;
const MAX_PAGE_SIZE = 100;

// Database tables & columns: snake_case
users, created_at, full_name, password_hash

// KHÔNG dùng
getUserById()     // quá dài, bỏ "get" khi context đã rõ
userData          // bỏ "Data" suffix
isSuccess         // bỏ "is" prefix trừ khi cần phân biệt
```

### Backend (TypeScript + Express)

```ts
// Một function làm một việc, tên là động từ + danh từ
async function createUser(payload: CreateUserData): Promise<UserPublic> {}
async function sendWelcomeEmail(user: UserPublic): Promise<void> {}

// Giới hạn tham số — quá 3 thì dùng object
// ❌
async function createOrder(userId: number, productId: number, quantity: number, address: string, coupon: string) {}
// ✅
async function createOrder({ userId, productId, quantity, address, coupon }: CreateOrderData) {}

// Early return thay vì nested if
async function getUser(id: number) {
  const user = await authService.findUserById(id);
  if (!user) throw new NotFoundError('User');
  if (!user.isActive) throw new ForbiddenError('Account is inactive');
  return user;
}

// Async/await — KHÔNG dùng .then().catch()
const user = await authService.findUserByEmail(email);
res.json({ success: true, data: user });
```

### Frontend (React + TypeScript)

```tsx
// Component: function declaration (không arrow function cho page components)
// ✅
export function LoginPage() {}

// Dùng forwardRef cho reusable UI components
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error }, ref) => {
  return <div>...</div>;
});
Input.displayName = 'Input';

// State: useState với explicit type hoặc type inference
const [serverError, setServerError] = useState('');       // inferred
const [isLoading, setIsLoading] = useState<boolean>(false);

// Event handlers: named function hoặc inline
const handleSubmit = (data: FormData) => {};

// Destructuring sớm trong function params
const { isAuthenticated, isLoading, login, logout } = useAuth();
```

### Variables & Constants

```ts
// Tên rõ nghĩa, không abbreviate trừ convention phổ biến
// ❌
const u = await authService.findUserById(id);
const res2 = await axiosClient.get('/users');
// ✅
const user = await authService.findUserById(id);
const response = await axiosClient.get('/users');

// Destructure sớm
// ❌
const userId = req.user.userId;
const email = req.user.email;
// ✅
const { userId, email } = req.user;

// const mặc định, let khi cần reassign, KHÔNG dùng var
const user = await authService.findUserById(id);
let retryCount = 0;
```

### Imports

```ts
// Thứ tự import: external packages → relative files (backend)
// import express from 'express';
// import jwt from 'jsonwebtoken';
// import { z } from 'zod';
// import { authenticate } from '../middleware/auth.js';
// import { createUserSchema } from './schemas/userSchema.js';
```

### Async Error Handling

```ts
// ✅ Try/catch trong controller, throw từ service
async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await authService.findUserByEmail(email);
    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }
    const valid = authService.comparePassword(password, user.password_hash);
    if (!valid) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }
    sendSuccess(res, { user, accessToken }, 'Login successful');
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    sendError(res, 'Login failed', 500, error);
  }
}
```

### Comments & Documentation

```ts
// Comment giải thích WHY, không giải thích WHAT
// ❌
// Lấy user từ database
const user = await authService.findUserByEmail(email);
// ✅
const user = await authService.findUserByEmail(email); // throw 409 nếu đã tồn tại
```

### Security

```ts
// ✅ KHÔNG bao giờ trả về password_hash
const userPublic = {
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
};

// ✅ KHÔNG log sensitive data
// ❌
console.log('Login attempt:', { email, password });
// ✅
console.log('Login attempt:', { email });

// ✅ Sanitize error message
throw err; // để global errorHandler xử lý
```

### Git Commit Convention (Conventional Commits)

```
feat: add user registration endpoint
fix: handle duplicate email in userService
refactor: extract token generation to authService
test: add unit tests for userService.create
chore: update dependencies
docs: add JSDoc to authService
chore: setup eslint and prettier

# Format: <type>(<scope>): <description>
# type: feat | fix | refactor | test | chore | docs | perf
# scope: optional, ví dụ: auth | user | order
```

### Environment Variables

```ts
// ✅ Validate env vars khi app khởi động — fail fast
// src/config/env.ts
const required = ['PORT', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// ✅ Import config thay vì process.env trực tiếp trong code
import { env } from './config/env.js';
jwt.sign(payload, env.jwt.secret);
```
