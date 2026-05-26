---
name: file-code-box
description: 文件快递柜 FileCodeBox 文件分享工具。当用户要求上传文件到 FileCodeBox、分享文件、通过口令分享文本或文件、文件快传时使用此 skill。
---

# FileCodeBox 文件快递柜

匿名口令分享文本和文件，像拿快递一样取文件。

## 前置条件

使用此 skill 前，必须向用户确认以下信息：

1. **FileCodeBox 服务地址**（必填）— 用户部署的 FileCodeBox URL，例如 `https://file.example.com`
2. **管理员密码**（按需）— 仅当游客上传失败（返回 403 "未开启游客上传"）时才需要用户提供密码，默认密码为 `FileCodeBox2023`

## API 路径说明

FileCodeBox 存在版本差异，API 路径前缀可能不同：

- **2.x 版本（常见）**：无 `/api` 前缀，路径为 `{baseUrl}/share/...`
- **master/最新版本**：有 `/api` 前缀，路径为 `{baseUrl}/api/share/...`

**探测方式**：先尝试无 `/api` 前缀的路径，若返回 HTML 页面（404 被前端拦截），则尝试带 `/api` 前缀的路径。

## API 调用方式

所有请求通过 `curl` 命令执行。

### 1. 上传文件

```bash
curl -s -X POST "{baseUrl}/share/file/" \
  -F "file=@/path/to/file" \
  -F "expire_value=1" \
  -F "expire_style=day"
```

若上述返回 HTML 页面，则改用：

```bash
curl -s -X POST "{baseUrl}/api/share/file/" \
  -F "file=@/path/to/file" \
  -F "expire_value=1" \
  -F "expire_style=day"
```

**参数说明：**
- `file`: 本地文件路径（必填）
- `expire_value`: 过期值，默认 1（整数，大于 0）
- `expire_style`: 过期类型，默认 `"day"`
  - 可选值: `"day"` | `"hour"` | `"minute"` | `"forever"` | `"count"`

**成功响应：**
```json
{"code": 200, "message": "ok", "detail": {"code": "A1B2C3", "name": "文件名.pdf"}}
```

### 2. 分享文本

```bash
curl -s -X POST "{baseUrl}/share/text/" \
  -d "text=要分享的文本内容" \
  -d "expire_value=1" \
  -d "expire_style=day"
```

若返回 HTML 页面，则改用 `{baseUrl}/api/share/text/`。

**参数说明：**
- `text`: 文本内容（必填，最大 222KB）
- `expire_value`: 过期值，默认 1
- `expire_style`: 过期类型，默认 `"day"`

**成功响应：**
```json
{"code": 200, "message": "ok", "detail": {"code": "X9Y8Z7"}}
```

### 3. 获取文件信息（取件）

```bash
curl -s -X POST "{baseUrl}/share/select/" \
  -H "Content-Type: application/json" \
  -d '{"code": "提取码"}'
```

若返回 HTML 页面，则改用 `{baseUrl}/api/share/select/`。

**成功响应：**
```json
{
  "code": 200,
  "message": "ok",
  "detail": {
    "code": "A1B2C3",
    "name": "文件名.pdf",
    "size": 1024,
    "text": "下载URL或文本内容"
  }
}
```

### 4. 管理员登录（仅在游客上传失败时使用）

```bash
curl -s -X POST "{baseUrl}/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"password": "用户提供的密码"}'
```

若返回 HTML 页面，则改用 `{baseUrl}/api/admin/login`。

**成功响应：**
```json
{"code": 200, "message": "ok", "detail": {"token": "xxx.yyy.zzz", "token_type": "Bearer"}}
```

登录后，后续上传请求需添加 `-H "Authorization: Bearer {token}"`：

```bash
curl -s -X POST "{baseUrl}/share/file/" \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/file" \
  -F "expire_value=1" \
  -F "expire_style=day"
```

## 工作流程

### 上传流程

```
1. 确认 baseUrl 和要上传的文件/文本
2. 尝试游客上传（不传 Authorization header）
   ├─ 成功 → 进入步骤 4
   └─ 失败（403）→ 进入步骤 3
3. 询问用户管理员密码
   ├─ 调用 POST /admin/login 获取 token
   └─ 携带 token 重新上传
4. 返回分享信息给用户
```

### 取件流程

```
1. 用户口述或提供提取码
2. 调用 POST /share/select/ 查询
3. 返回文件信息（名称、大小、下载链接）
```

## 输出格式

上传成功后，以如下格式告知用户：

```
✅ 上传成功！

📦 分享信息：
- 提取码：A1B2C3
- 文件名：文件名.pdf
- 有效期：1 天

🔗 分享链接：{baseUrl}/#/s/A1B2C3
📤 取件页面：{baseUrl}

将提取码或分享链接发给对方即可取件。
```

文本分享成功后：

```
✅ 文本分享成功！

📦 分享信息：
- 提取码：X9Y8Z7
- 有效期：1 天

🔗 分享链接：{baseUrl}/#/s/X9Y8Z7

将提取码或分享链接发给对方即可查看。
```

## 注意事项

- 文件大小限制默认 10MB（由服务端 `uploadSize` 配置）
- 文本大小限制 222KB
- 提取码由服务端自动生成，不需要用户指定
- `expire_style` 为 `"forever"` 时 `expire_value` 填 1 即可
- `expire_style` 为 `"count"` 时 `expire_value` 表示可取次数
- 响应中 `code` 字段是 HTTP 状态码（200 表示成功），`detail.code` 才是文件提取码
