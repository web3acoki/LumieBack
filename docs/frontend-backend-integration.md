# LumieClaw 前后端对接文档 — 登录认证篇

> 生成日期: 2026-04-01

---

## 一、你的后端登录系统现状

### ✅ 已完成的功能

你的后端**已经完整实现了 Google OAuth 2.0 登录**，并且用户系统非常完善：

| 功能 | 状态 | 说明 |
|------|------|------|
| Google OAuth 2.0 | ✅ 完成 | 使用 `google-auth-library` 验证 idToken |
| 邮箱注册/登录 | ✅ 完成 | 密码 bcrypt 加密 |
| Facebook OAuth | ✅ 完成 | 完整实现 |
| Apple OAuth | ✅ 完成 | 完整实现 |
| JWT Token | ✅ 完成 | Access Token (15分钟) + Refresh Token (3650天) |
| Session 管理 | ✅ 完成 | 数据库持久化，支持多设备 |
| 邮箱确认 | ✅ 完成 | 注册后发送确认邮件 |
| 忘记密码 | ✅ 完成 | 邮件重置链接 |
| 用户信息更新 | ✅ 完成 | 支持修改个人资料 |
| 角色权限 | ✅ 完成 | Admin / User 两种角色 |

### 符合开发文档要求吗？

**完全符合！** 你的产品需求文档 5.1 章节要求的所有功能都已实现：

- ✅ OAuth 2.0 (Google/Facebook/Apple)
- ✅ 邮箱密码登录
- ✅ Refresh Token 无感刷新
- ✅ 安全退出
- ✅ Session 管理

---

## 二、Google OAuth 2.0 登录完整流程

### 架构图

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   前端 (React)   │         │  你的后端 NestJS  │         │  Google OAuth   │
│                 │         │                  │         │                 │
│  1. 用户点击     │         │                  │         │                 │
│  "Google登录"   │         │                  │         │                 │
│                 │         │                  │         │                 │
│  2. 弹出Google  │────────▶│                  │────────▶│  3. 用户授权    │
│     授权页面     │         │                  │         │                 │
│                 │         │                  │         │                 │
│  4. 获得idToken │◀────────│                  │◀────────│  返回idToken    │
│                 │         │                  │         │                 │
│  5. POST        │         │  6. 验证idToken  │         │                 │
│  /auth/google/  │────────▶│  7. 查找/创建用户 │         │                 │
│  login          │         │  8. 创建Session  │         │                 │
│                 │         │  9. 生成JWT      │         │                 │
│                 │         │                  │         │                 │
│  10. 收到JWT    │◀────────│  返回token+user  │         │                 │
│  存储到本地     │         │                  │         │                 │
│                 │         │                  │         │                 │
│  11. 后续请求   │         │  12. 验证JWT     │         │                 │
│  带Authorization│────────▶│  Bearer token    │         │                 │
│  header         │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## 三、前端对接步骤 (详细代码示例)

### Step 1: 前端集成 Google OAuth SDK

#### 安装依赖

```bash
npm install @react-oauth/google
# 或
yarn add @react-oauth/google
```

#### 在 App 根组件包裹 GoogleOAuthProvider

```tsx
// App.tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

function App() {
  return (
    <GoogleOAuthProvider clientId="你的Google Client ID">
      <YourApp />
    </GoogleOAuthProvider>
  );
}
```

**获取 Google Client ID:**
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目 → APIs & Services → Credentials
3. 创建 OAuth 2.0 客户端 ID (Web 应用)
4. 配置授权重定向 URI (如 `http://localhost:3000`)
5. 复制 Client ID

---

### Step 2: 创建 Google 登录按钮组件

```tsx
// components/GoogleLoginButton.tsx
import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import axios from 'axios';

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // 发送 idToken 到你的后端
        const response = await axios.post(
          'http://localhost:3000/api/v1/auth/google/login',
          {
            idToken: tokenResponse.access_token, // ⚠️ 注意：这里实际应该用 credential (id_token)
          }
        );

        // 保存 JWT token
        localStorage.setItem('accessToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        // 保存用户信息
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // 跳转到主页
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('登录失败:', error);
        alert('登录失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      alert('Google 授权失败');
    },
  });

  return (
    <button onClick={() => login()} disabled={loading}>
      {loading ? '登录中...' : '使用 Google 登录'}
    </button>
  );
}
```

**⚠️ 重要修正:** 上面的代码有个问题，`useGoogleLogin` 返回的是 `access_token`，但你的后端需要的是 `id_token`。正确的方式是使用 `GoogleLogin` 组件：

```tsx
// components/GoogleLoginButton.tsx (正确版本)
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export function GoogleLoginButton() {
  const handleSuccess = async (credentialResponse: any) => {
    try {
      // credentialResponse.credential 就是 idToken
      const response = await axios.post(
        'http://localhost:3000/api/v1/auth/google/login',
        {
          idToken: credentialResponse.credential,
        }
      );

      // 保存 token
      localStorage.setItem('accessToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // 跳转
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败');
    }
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={() => alert('Google 授权失败')}
      useOneTap
    />
  );
}
```

---

### Step 3: 后端接口详情

#### 请求格式

```http
POST /api/v1/auth/google/login
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4M..."
}
```

#### 响应格式 (成功 200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenExpires": 1711965587000,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "张",
    "lastName": "三",
    "role": {
      "id": 2,
      "name": "user"
    },
    "status": {
      "id": 1,
      "name": "active"
    },
    "provider": "google",
    "socialId": "1234567890",
    "createdAt": "2026-04-01T09:00:00.000Z",
    "updatedAt": "2026-04-01T09:00:00.000Z"
  }
}
```

#### 响应格式 (失败 422)

```json
{
  "status": 422,
  "errors": {
    "user": "wrongToken"
  }
}
```

---

### Step 4: 后续请求带上 JWT Token

所有需要认证的请求都要在 Header 中带上 `Authorization`:

```tsx
// utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// 请求拦截器：自动添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：token 过期自动刷新
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是 401 且没有重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 用 refreshToken 换新 token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          'http://localhost:3000/api/v1/auth/refresh',
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        // 保存新 token
        localStorage.setItem('accessToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // refresh 也失败了，跳转登录页
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### 使用示例

```tsx
// 获取当前用户信息
import api from './utils/api';

async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}

// 更新用户信息
async function updateProfile(data: { firstName: string; lastName: string }) {
  const response = await api.patch('/auth/me', data);
  return response.data;
}

// 退出登录
async function logout() {
  await api.post('/auth/logout');
  localStorage.clear();
  window.location.href = '/login';
}
```

---

## 四、邮箱密码登录对接

### 注册流程

```tsx
// 1. 用户填写注册表单
async function register(email: string, password: string, firstName: string, lastName: string) {
  try {
    await axios.post('http://localhost:3000/api/v1/auth/email/register', {
      email,
      password,
      firstName,
      lastName,
    });

    alert('注册成功！请查收邮件确认账号');
    // 跳转到登录页或提示用户查收邮件
  } catch (error) {
    console.error('注册失败:', error);
  }
}

// 2. 用户点击邮件中的确认链接
// 链接格式: http://your-frontend.com/auth/confirm-email?hash=xxx

// 3. 前端调用确认接口
async function confirmEmail(hash: string) {
  try {
    await axios.post('http://localhost:3000/api/v1/auth/email/confirm', {
      hash,
    });

    alert('邮箱确认成功！现在可以登录了');
    window.location.href = '/login';
  } catch (error) {
    alert('确认链接无效或已过期');
  }
}
```

### 登录流程

```tsx
async function loginWithEmail(email: string, password: string) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/auth/email/login',
      {
        email,
        password,
      }
    );

    // 保存 token 和用户信息
    localStorage.setItem('accessToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    window.location.href = '/dashboard';
  } catch (error: any) {
    if (error.response?.data?.errors?.email === 'notFound') {
      alert('邮箱不存在');
    } else if (error.response?.data?.errors?.password === 'incorrectPassword') {
      alert('密码错误');
    } else {
      alert('登录失败');
    }
  }
}
```

### 忘记密码流程

```tsx
// 1. 请求重置密码
async function forgotPassword(email: string) {
  try {
    await axios.post('http://localhost:3000/api/v1/auth/forgot/password', {
      email,
    });

    alert('重置密码邮件已发送，请查收');
  } catch (error) {
    alert('邮箱不存在');
  }
}

// 2. 用户点击邮件中的重置链接
// 链接格式: http://your-frontend.com/auth/reset-password?hash=xxx

// 3. 前端调用重置接口
async function resetPassword(hash: string, newPassword: string) {
  try {
    await axios.post('http://localhost:3000/api/v1/auth/reset/password', {
      hash,
      password: newPassword,
    });

    alert('密码重置成功！');
    window.location.href = '/login';
  } catch (error) {
    alert('重置链接无效或已过期');
  }
}
```

---

## 五、完整的后端 API 列表

### 认证相关

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/v1/auth/email/register` | POST | ❌ | 邮箱注册 |
| `/api/v1/auth/email/login` | POST | ❌ | 邮箱登录 |
| `/api/v1/auth/email/confirm` | POST | ❌ | 确认邮箱 |
| `/api/v1/auth/email/confirm/new` | POST | ✅ | 确认新邮箱 (更新邮箱时) |
| `/api/v1/auth/forgot/password` | POST | ❌ | 请求重置密码 |
| `/api/v1/auth/reset/password` | POST | ❌ | 重置密码 |
| `/api/v1/auth/google/login` | POST | ❌ | Google 登录 |
| `/api/v1/auth/facebook/login` | POST | ❌ | Facebook 登录 |
| `/api/v1/auth/apple/login` | POST | ❌ | Apple 登录 |
| `/api/v1/auth/me` | GET | ✅ | 获取当前用户信息 |
| `/api/v1/auth/me` | PATCH | ✅ | 更新个人信息 |
| `/api/v1/auth/me` | DELETE | ✅ | 删除账号 (软删除) |
| `/api/v1/auth/refresh` | POST | ✅ (Refresh Token) | 刷新 Access Token |
| `/api/v1/auth/logout` | POST | ✅ | 退出登录 |

### 用户管理 (Admin 专用)

| 端点 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/api/v1/users` | GET | Admin | 用户列表 (分页) |
| `/api/v1/users/:id` | GET | Admin | 获取用户详情 |
| `/api/v1/users` | POST | Admin | 创建用户 |
| `/api/v1/users/:id` | PATCH | Admin | 更新用户 |
| `/api/v1/users/:id` | DELETE | Admin | 删除用户 |

---

## 六、环境变量配置 (后端)

你的后端需要配置这些环境变量 (`.env` 文件):

```env
# Google OAuth
GOOGLE_CLIENT_ID=你的Google Client ID
GOOGLE_CLIENT_SECRET=你的Google Client Secret

# Facebook OAuth (可选)
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Apple OAuth (可选)
APPLE_APP_AUDIENCE=xxx

# JWT 密钥
AUTH_JWT_SECRET=your-secret-key-change-this
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=your-refresh-secret-change-this
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d

# 邮件确认
AUTH_CONFIRM_EMAIL_SECRET=your-confirm-secret
AUTH_CONFIRM_EMAIL_EXPIRES_IN=1d

# 忘记密码
AUTH_FORGOT_SECRET=your-forgot-secret
AUTH_FORGOT_EXPIRES_IN=30m

# 前端域名 (用于邮件链接)
FRONTEND_DOMAIN=http://localhost:3000

# 后端域名
BACKEND_DOMAIN=http://localhost:3000

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/lumieclaw
# 或者分开配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=lumieclaw

# SMTP 邮件服务
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_EMAIL=noreply@lumieclaw.com
MAIL_DEFAULT_NAME=LumieClaw
```

---

## 七、常见问题 FAQ

### Q1: Google 登录时提示 "wrongToken" 错误？

**原因:** 前端发送的不是 `id_token`，而是 `access_token`。

**解决:** 使用 `<GoogleLogin>` 组件而不是 `useGoogleLogin` hook，或者配置 `useGoogleLogin` 的 `flow: 'implicit'`。

### Q2: JWT Token 过期了怎么办？

**解决:** 使用 Refresh Token 自动刷新，参考上面的 axios 拦截器代码。

### Q3: 如何判断用户是否登录？

```tsx
function isLoggedIn() {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  // 可选：验证 token 是否过期
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
```

### Q4: 如何实现"记住我"功能？

后端的 Refresh Token 已经是 3650 天过期，前端只需要把 token 存在 `localStorage` 而不是 `sessionStorage` 即可。

### Q5: 多设备登录如何管理？

后端已经支持多设备登录 (每次登录创建新 Session)。如果要限制单设备登录，需要在登录时删除该用户的其他 Session。

---

## 八、总结

### ✅ 你的后端已经完成

1. **Google OAuth 2.0** — 完整实现，使用 `google-auth-library` 验证 idToken
2. **用户系统** — 完善的 CRUD、角色权限、Session 管理
3. **JWT 认证** — Access Token + Refresh Token 双 token 机制
4. **邮箱认证** — 注册确认、密码重置
5. **多端登录** — Google / Facebook / Apple / Email

### 前端需要做的

1. 集成 `@react-oauth/google` SDK
2. 实现登录按钮，获取 idToken 后发送到后端
3. 保存后端返回的 JWT token
4. 后续请求带上 `Authorization: Bearer {token}`
5. 实现 token 自动刷新逻辑

### 符合产品需求文档吗？

**100% 符合！** 你的后端认证系统已经完全满足产品需求文档 5.1 章节的所有要求，可以直接对接前端使用。
