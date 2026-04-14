---
name: website-security-scan
description: 网站安全扫描与加固。用于检查 HTTP 安全头、CORS 配置、CSP 策略、敏感文件暴露、前端代码 XSS 风险等安全问题，并提供 Nginx/FastAPI 修复模板。当用户要求安全检查、安全扫描、CORS 修复、CSP 配置时使用。
---

# 网站安全扫描 SKILL

## Error Handling

- timeout → retry 2 times
- blocked → fallback to passive scan
- DNS fail → skip DNS checks


## 检查清单

### 1. HTTP 安全响应头

```bash
curl -sI https://example.com/
```

必须包含：

| Header | 期望值 | 防御 |
|---|---|---|
| Strict-Transport-Security | `max-age=31536000` | 强制 HTTPS |
| X-Frame-Options | `SAMEORIGIN` | 点击劫持 |
| X-Content-Type-Options | `nosniff` | MIME 嗅探 |
| X-XSS-Protection | `1; mode=block` | XSS 过滤 |
| Referrer-Policy | `strict-origin-when-cross-origin` | 信息泄露 |
| Content-Security-Policy | 见下方模板 | 多种注入攻击 |

### 2. CSP 模板（Nginx）

```nginx
# 用变量避免单行过长导致 HTTP/2 协议错误
set $csp "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.example.com; font-src 'self' data:; frame-ancestors 'self';";
add_header Content-Security-Policy $csp always;
```

**注意事项**：
- CSP 值必须用 Nginx `set` 变量，不能直接写在 `add_header` 长字符串中（会触发 HTTP/2 ERR_HTTP2_PROTOCOL_ERROR）
- `connect-src` 必须包含后端 API 域名和所有外部请求域名（如 CDN、图标服务等）
- 新增外部域名时需同步更新 CSP

### 3. CORS 验证

```bash
# 测试恶意域名是否被允许（应该被拒绝）
curl -sI -X OPTIONS \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.example.com/login

# 测试合法域名（应该返回 access-control-allow-origin）
curl -sI -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.example.com/login
```

**判断标准**：
- 恶意域名：应返回 400/403 或**无** `access-control-allow-origin` 头
- 合法域名：应返回 `access-control-allow-origin: https://example.com`
- **`origins = ["*"]` + `allow_credentials=True` 是最危险的组合，必须禁止**

### 4. 敏感文件暴露检查

```bash
curl -sI https://example.com/.env           # 应返回 404
curl -sI https://example.com/.git/config    # 应返回 404
curl -sI https://example.com/assets/index.js.map  # Source Map 应返回 404
curl -sI https://example.com/assets/        # 目录列表应返回 403
```

### 5. 前端代码安全检查

```bash
# 搜索 XSS 风险点
grep -rn "v-html\|innerHTML\|document\.write" src/

# 搜索 Token 存储方式
grep -rn "localStorage\|sessionStorage" src/

# 搜索外部请求
grep -rn "window\.open\|eval(\|new Function" src/
```

### 6. 本地开发 CORS 解决方案

不要在 `VITE_API_URL` 写完整 URL，改为相对路径走 Vite 代理：

```env
# .env.development
VITE_API_URL = /api/admin/                          # 相对路径
VITE_API_PROXY_URL = https://api.example.com         # 代理目标
```

原理：浏览器 → localhost（同源） → Vite 代理 → 生产 API（服务端转发无 CORS）

## 修复模板

### Nginx 安全头（一次性配置）

```nginx
server {
    # ... SSL 配置 ...

    add_header Strict-Transport-Security "max-age=31536000";
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    set $csp "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.example.com; font-src 'self' data:; frame-ancestors 'self';";
    add_header Content-Security-Policy $csp always;

    # ... 其他配置 ...
}
```

### FastAPI CORS 修复

```python
def _build_origins():
    """从配置读取 CORS 域名，不硬编码"""
    origins = []
    admin_domain = getattr(settings, 'ADMIN_DOMAIN', '') or ''
    if admin_domain:
        origins.append(admin_domain)
    if settings.ENV == EnvEnum.LOCAL:
        origins.extend(['http://localhost:3000', 'http://localhost:5173'])
    if not origins:
        origins = ['https://your-production-domain.com']
    return origins

origins = _build_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```json
{
  "target": "example.com",
  "score": 72,
  "issues": [
    {
      "type": "missing_header",
      "name": "X-Frame-Options",
      "severity": "medium",
      "evidence": "...",
      "fix": "Add header ..."
    }
  ]
}
```

## 常见踩坑

| 问题 | 原因 | 解决 |
|---|---|---|
| ERR_HTTP2_PROTOCOL_ERROR | CSP 字符串过长 | 用 Nginx `set $csp` 变量 |
| API 请求被 CSP 拦截 | `connect-src` 缺少 API 域名 | 加到 CSP `connect-src` |
| 图标/字体不显示 | 缺少 `img-src data:` 或 `font-src data:` | 加对应指令 |
| 本地开发 CORS 报错 | 直连生产 API | 改 `VITE_API_URL` 为相对路径走代理 |
| vendor-vue 循环依赖 | vue 系列包单独分包 | vue/pinia/vue-router 不拆分 |
