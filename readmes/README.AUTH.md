# Auth / JWT 路由保护说明

本项目的认证体系以 **auth-service 签发的 JWT** 为核心，并通过 **HttpOnly Cookie（bluenet_token）** 在 Webapp 侧实现“服务端可校验”的路由保护。

本文档说明：
- JWT 的签发与 Cookie 设置方式（auth-service）
- Webapp 的路由保护策略（middleware + Server Component layout）
- Webapp 侧的认证状态获取方式（/api/auth/me + AuthProvider）
- 常见配置项与排错方向

---

## 1. 认证令牌与 Cookie

### 1.1 Cookie 名称

- Access token：`bluenet_token`
- Refresh token：`bluenet_refresh_token`

Webapp 的路由保护主要依赖 `bluenet_token`。

### 1.2 auth-service 如何签发 JWT

auth-service 在登录与刷新时构造 payload：

- `sub`：用户 ID（UUID 字符串）
- `username`：用户名
- `role`：角色

并在签发时追加：

- `exp`：过期时间
- `type`：`access` / `refresh`

参考实现：
- `token_data`：`auth-service/api/auth.py`
- `create_access_token` / `create_refresh_token`：`auth-service/core/security.py`

### 1.3 auth-service 如何设置 HttpOnly Cookie

auth-service 登录成功后会把 access token 写入 HttpOnly Cookie（便于 Next.js 的 middleware/layout 在服务端读 cookie 做鉴权）。

参考实现：`auth-service/api/auth.py` 的 `set_auth_cookies()`

---

## 2. Webapp 路由保护（强制）

Webapp 路由保护采用两层：

1) **Next.js Middleware**：请求级别重定向（更早拦截，覆盖更广）  
2) **Server Component / Layout**：页面级别重定向（“强保护”，即使绕过 middleware 也无法渲染页面）

### 2.1 Middleware（请求级别）

文件：`webapp/middleware.ts`

核心逻辑：
- 放行：`/api/*`、静态资源、favicon 等
- 读取：`req.cookies.get('bluenet_token')`
- 未登录且非 `/login`/`/logout`：重定向到 `/login?next=...`
- 已登录访问 `/login`：重定向到 `/home`

注意：
- middleware 不应放行整个 `/_next/*`，否则可能出现“客户端导航/预取绕过保护”的体验问题。

### 2.2 Layout（页面级别，强保护）

对关键页面添加同目录 `layout.tsx`（Server Component）：
- 服务端读取 `cookies()` 中的 `bluenet_token`
- 不存在则 `redirect('/login?next=...')`

已加保护的页面（示例）：
- `webapp/src/app/graph/layout.tsx`
- `webapp/src/app/projects/layout.tsx`
- `webapp/src/app/reports/layout.tsx`
- `webapp/src/app/settings/layout.tsx`
- `webapp/src/app/insights/layout.tsx`
- `webapp/src/app/cypherfix/layout.tsx`

这层的目标是：即使有人绕过 middleware 或直接请求 RSC 资源，也无法拿到页面内容。

---

## 3. Webapp 获取“当前登录用户”（基于 Cookie）

### 3.1 /api/auth/me（不返回原始 token）

文件：`webapp/src/app/api/auth/me/route.ts`

用途：
- 服务端读取 HttpOnly Cookie `bluenet_token`
- 解码 JWT payload（不返回 cookie 中的原始 token）
- 返回 `authenticated`、`user`（从 payload 提取）、`exp` 等信息

返回值形态（示意）：

```json
{
  "authenticated": true,
  "user": {
    "id": "uuid-string",
    "username": "alice",
    "email": null,
    "role": "admin"
  },
  "exp": "2026-01-01T00:00:00.000Z",
  "jwt": {
    "header": { "alg": "HS256", "typ": "JWT" },
    "payload": { "sub": "...", "username": "...", "role": "...", "type": "access", "exp": 0 }
  }
}
```

### 3.2 AuthProvider：以 cookie 为准的前端认证状态

文件：`webapp/src/providers/AuthProvider.tsx`

策略：
- 启动时请求 `/api/auth/me`
- 用返回的 `authenticated/user` 作为前端登录态来源
- `setFromLogin()` 只做“登录成功后的前端即时刷新”，会话权威仍以 Cookie 为准
- `logoutLocal()` 只清理前端状态，Cookie 清理由 `/api/auth/logout` 完成

### 3.3 UserInfo：始终展示当前登录用户

文件：`webapp/src/components/layout/GlobalHeader/UserInfo/UserInfo.tsx`

策略：
- 不依赖 localStorage 的 userId
- 直接从 `useAuth()` 获取 `user.username/email`

---

## 4. Webapp 登录/登出接口

### 4.1 登录

文件：`webapp/src/app/api/auth/login/route.ts`

作用：
- 代理请求到 `AUTH_API_URL` 的 `/auth/login`
- 透传 auth-service 返回的 `set-cookie`（包含 `bluenet_token`）
- 同步创建/匹配 webapp 本地 User，并返回 `webapp_user_id`（用于项目系统的 userId）

环境变量：
- `AUTH_API_URL` 或 `NEXT_PUBLIC_AUTH_API_URL`（默认 `http://localhost:8100`）

### 4.2 登出

文件：`webapp/src/app/api/auth/logout/route.ts`

作用：
- 代理到 auth-service 的 `/auth/logout`
- 并额外清理 `bluenet_token` / `bluenet_refresh_token`
- Cookie 的 `secure` 取决于 `x-forwarded-proto`

---

## 5. 常见排错

### 5.1 未登录仍能访问受保护页面

优先检查：
- `webapp/middleware.ts` 是否错误放行了 `/_next/*`
- 关键页面是否缺少 `layout.tsx` 的服务端重定向

### 5.2 前端显示“未识别用户”

优先检查：
- 浏览器是否带上了 `bluenet_token`（HttpOnly 不可在控制台直接读取，但可在 DevTools Application/Cookies 查看）
- `/api/auth/me` 是否返回 200
- `AuthProvider` 是否已加载完成（`isLoading`）

### 5.3 Secure Cookie 在本地开发不生效

`secure` 取决于 `x-forwarded-proto` 或请求协议。若反向代理/网关配置不正确，可能导致 Cookie 不被浏览器接收。

