---
name: use-http-mcp
description: 当用户需要"发送 HTTP 请求"、"调用 REST API"、"测试 API 接口"、"获取网页内容"、"发送 POST/GET 请求"、"使用 fetch API"、"处理 JSON API"时，或者在 JavaScript/Node.js 环境中需要发起 HTTP 请求处理 Web API 时使用此 skill。
version: 1.0.0
skill_version: 260221.140208
---

# 使用 HTTP MCP 工具

本 skill 提供使用 Node.js 发送 HTTP 请求、调用 REST API、测试接口的完整指南。基于原生 `fetch` API，无需额外依赖，支持各种 HTTP 方法和认证方式。

## 概述

HTTP MCP 工具使用 Node.js 原生的 `fetch` API（Node.js 18+ 内置），可以：
- 发送 GET/POST/PUT/DELETE/PATCH 等 HTTP 请求
- 处理 JSON 数据
- 支持 Basic Auth、Bearer Token、API Key 等认证
- 处理文件上传/下载
- 设置请求头和超时

## 运行方式

**直接运行，无需安装依赖：**

```bash
# GET 请求
node skill.js get <url>

# POST 请求（JSON）
node skill.js post <url> '{"key": "value"}'

# 带请求头
node skill.js get <url> -H "Authorization: Bearer token"

# 带认证
node skill.js get <url> -u user:pass
node skill.js get <url> -b token

# 保存响应到文件
node skill.js get <url> -o output.json

# 显示响应头
node skill.js get <url> -i

# 完整模式（显示请求和响应详情）
node skill.js get <url> -v
```

---

## 基本用法

### GET 请求

```bash
# 简单 GET
node skill.js get https://api.example.com/users

# 带查询参数
node skill.js get "https://api.example.com/search?q=node&page=1"

# 只显示响应头
node skill.js get https://api.example.com/users -i
```

### POST 请求

```bash
# POST JSON
node skill.js post https://api.example.com/users '{"name": "张三", "age": 25}'

# POST 表单数据
node skill.js post https://api.example.com/login -f "username=admin&password=123456"

# PUT 请求
node skill.js put https://api.example.com/users/1 '{"name": "李四"}'

# DELETE 请求
node skill.js delete https://api.example.com/users/1

# PATCH 请求
node skill.js patch https://api.example.com/users/1 '{"age": 26}'
```

### 认证

```bash
# Basic Auth
node skill.js get https://api.example.com/protected -u admin:123456

# Bearer Token
node skill.js get https://api.example.com/protected -b eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Key（通过请求头）
node skill.js get https://api.example.com/data -H "X-API-Key: your-key-here"
```

---

## 高级功能

### 自定义请求头

```bash
# 单个请求头
node skill.js get https://api.example.com/data -H "Accept: application/json"

# 多个请求头
node skill.js get https://api.example.com/data -H "Accept: application/json" -H "User-Agent: MyClient/1.0"
```

### 文件操作

```bash
# 保存响应体到文件
node skill.js get https://api.example.com/data -o response.json

# 从文件读取请求体
node skill.js post https://api.example.com/data @request.json

# 上传文件
node skill.js post https://api.example.com/upload --file image.png
```

### 调试模式

```bash
# 完整模式（显示请求和响应详情）
node skill.js get https://api.example.com/users -v

# 仅显示响应头
node skill.js get https://api.example.com/users -i

# 显示 curl 等价命令
node skill.js get https://api.example.com/users --curl
```

---

## 选项说明

| 选项 | 说明 | 示例 |
|------|------|------|
| `-H, --header` | 添加请求头 | `-H "Content-Type: application/json"` |
| `-u, --user` | Basic Auth | `-u username:password` |
| `-b, --bearer` | Bearer Token | `-b your-token-here` |
| `-o, --output` | 保存响应到文件 | `-o output.json` |
| `-i, --include` | 显示响应头 | `-i` |
| `-v, --verbose` | 完整调试模式 | `-v` |
| `-f, --form` | 表单数据 | `-f "key=value&key2=value2"` |
| `--file` | 上传文件 | `--file image.png` |
| `--timeout` | 请求超时（秒） | `--timeout 30` |
| `--curl` | 显示 curl 等价命令 | `--curl` |
| `--mcp-tools` | 获取 MCP 服务器工具列表 | `--mcp-tools` |

---

## 响应格式

### 成功响应

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 1,
  "name": "张三",
  "email": "zhangsan@example.com"
}
```

### 错误响应

```
✗ HTTP Error: 404 Not Found

✗ 请求失败
```

---

## 使用示例

### 获取 GitHub 用户信息

```bash
node skill.js get https://api.github.com/users/nodejs
```

### 创建资源（POST）

```bash
node skill.js post https://api.example.com/posts '{
  "title": "Hello World",
  "body": "This is a test post",
  "userId": 1
}'
```

### 调用 OpenAI API

```bash
node skill.js post https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 文件上传

```bash
node skill.js post https://api.example.com/upload --file document.pdf
```

---

## 与 curl 对比

| 功能 | curl | skill.js |
|------|------|----------|
| 基本请求 | ✅ | ✅ |
| JSON 处理 | 需要 jq | ✅ 自动格式化 |
| Node.js 集成 | ❌ | ✅ |
| 跨平台 | ✅ | ✅ |
| 输出格式 | 原始 | 可读性好 |

---

## 限制与注意事项

### 限制

- 需要 Node.js 18 或更高版本
- 不支持 WebSocket
- 不支持浏览器 CORS（运行在服务端）

### 推荐场景

- API 测试和调试
- 自动化脚本
- CI/CD 流程
- 数据采集
- Webhook 处理

---

## MCP 服务器支持

本工具支持与 MCP (Model Context Protocol) 服务器交互，可以：
- 获取 MCP 服务器的工具列表
- 调用 MCP 工具
- 支持 REST API 风格的 MCP 服务器

### 获取 MCP 工具列表

```bash
# 自动检测并获取工具列表
node skill.js get <mcp-server-url> --mcp-tools

# 带认证获取工具列表
node skill.js get <mcp-server-url> -b <token> --mcp-tools
node skill.js get <mcp-server-url> -H "Authorization: Bearer <token>" --mcp-tools

# 示例：SearXNG MCP 服务器
node skill.js get https://smcp.hk4.iw8.win/api/mcp -H "Authorization: Bearer 123123123" --mcp-tools

# 示例：Memory MCP 服务器
node skill.js get https://localhost:8086 -H "Authorization: Bearer test123" --mcp-tools
```

工具会自动尝试以下方式获取 MCP 工具列表：
1. **REST API 端点** - 尝试 GET `/api/mcp`
2. **MCP JSON-RPC 协议** - 尝试 `initialize` + `tools/list`
3. **OpenAPI 规范** - 从 `/openapi.json` 推断 `/tools/*` 端点

### 调用 MCP 工具

```bash
# 调用 MCP 工具（REST API 风格）
node skill.js post <mcp-server-url>/tools/<tool-name> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  '{"param1": "value1"}'

# 示例：Memory MCP - 创建实体
node skill.js post https://localhost:8086/tools/entities/create \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  '{"entities": [{"name": "测试实体", "entityType": "person", "observations": ["观察1"]}]}'

# 示例：Memory MCP - 搜索实体
node skill.js get "https://localhost:8086/tools/search/nodes?query=测试&limit=5" \
  -H "Authorization: Bearer test123"
```

---

## 常见问题

### Q: 如何处理 HTTPS 证书错误？

A: 使用环境变量 `NODE_TLS_REJECT_UNAUTHORIZED=0`（不推荐生产环境）

### Q: 如何设置代理？

A: 使用环境变量 `HTTP_PROXY` 和 `HTTPS_PROXY`

### Q: 支持哪些认证方式？

A: Basic Auth、Bearer Token、API Key、OAuth 2.0（通过请求头）
