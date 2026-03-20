---
name: use-http-mcp
description: 当用户需要"发送 HTTP 请求"、"调用 REST API"、"测试 API 接口"、"获取网页内容"、"发送 POST/GET 请求"、"使用 fetch API"、"处理 JSON API"时，或者在 JavaScript/Node.js 环境中需要发起 HTTP 请求处理 Web API 时使用此 skill。
version: 1.0.0
skill_version: 260221.140208
---

# 使用 HTTP MCP 工具

本 skill 提供使用 Node.js 发送 HTTP 请求、调用 REST API、测试接口的完整指南。基于原生 `fetch` API，无需额外依赖。

## 概述

HTTP MCP 工具使用 Node.js 18+ 内置的 `fetch` API，支持：
- 发送 GET/POST/PUT/DELETE/PATCH 等 HTTP 请求
- 处理 JSON 数据和表单数据
- 支持 Basic Auth、Bearer Token、API Key 等认证
- 文件上传/下载
- 设置请求头和超时
- **MCP 服务器交互**（获取工具列表、调用工具）

## 快速开始

```bash
# GET 请求
node skill.js get <url>

# POST 请求（JSON）
node skill.js post <url> '{"key": "value"}'

# 带认证
node skill.js get <url> -u <user>:<pass>           # Basic Auth
node skill.js get <url> -b <your-token>            # Bearer Token
node skill.js get <url> -H "X-API-Key: <key>"      # API Key

# 保存响应
node skill.js get <url> -o output.json

# 显示响应头
node skill.js get <url> -i

# 调试模式
node skill.js get <url> -v
```

## HTTP 方法示例

```bash
# GET
node skill.js get https://api.example.com/users

# POST JSON
node skill.js post https://api.example.com/users '{"name": "张三", "age": 25}'

# POST 表单
node skill.js post https://api.example.com/login -f "username=<user>&password=<pass>"

# PUT
node skill.js put https://api.example.com/users/1 '{"name": "李四"}'

# DELETE
node skill.js delete https://api.example.com/users/1

# PATCH
node skill.js patch https://api.example.com/users/1 '{"age": 26}'
```

## 选项说明

| 选项 | 说明 | 示例 |
|------|------|------|
| `-H, --header` | 添加请求头 | `-H "Content-Type: application/json"` |
| `-u, --user` | Basic Auth | `-u <user>:<pass>` |
| `-b, --bearer` | Bearer Token | `-b <your-token>` |
| `-o, --output` | 保存响应到文件 | `-o output.json` |
| `-i, --include` | 显示响应头 | `-i` |
| `-v, --verbose` | 完整调试模式 | `-v` |
| `-f, --form` | 表单数据 | `-f "key=value"` |
| `--file` | 上传文件 | `--file image.png` |
| `--timeout` | 请求超时（秒） | `--timeout 30` |
| `--mcp-tools` | 获取 MCP 服务器工具列表 | `--mcp-tools` |

## MCP 服务器支持

本工具支持与 MCP (Model Context Protocol) 服务器交互。

### 获取 MCP 工具列表

```bash
# 自动检测并获取工具列表
node skill.js get <mcp-server-url> --mcp-tools

# 带认证
node skill.js get <mcp-server-url> -H "Authorization: Bearer <your-token>" --mcp-tools
```

工具会自动尝试以下方式：
1. **REST API 端点** - 尝试 GET `/mcp`（某些服务可能使用 `/api/mcp`）
2. **MCP JSON-RPC 协议** - 使用 `/mcp` 端点进行 `initialize` + `tools/list`

### MCP JSON-RPC 协议完整调用流程

**重要**: 许多 MCP 服务器需要使用 JSON-RPC 协议并维护会话状态。

#### 步骤 1: 初始化会话（获取 Session ID）

```bash
# 初始化并从响应头获取 mcp-session-id
node skill.js post <mcp-server-url>/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -i \
  '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "use-http-mcp",
        "version": "1.0.0"
      }
    }
  }'
```

**关键点**:
- `-i` 显示响应头，包含 `mcp-session-id`
- **必须**包含 `Accept: application/json` 头，否则返回 406
- 记录响应头中的 `mcp-session-id` 值

#### 步骤 2: 使用 Session ID 调用工具

```bash
# 获取工具列表
node skill.js post <mcp-server-url>/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "mcp-session-id: <session-id>" \
  '{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'

# 调用具体工具
node skill.js post <mcp-server-url>/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "mcp-session-id: <session-id>" \
  '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "<tool-name>",
      "arguments": {
        "query": "<搜索关键词>"
      }
    }
  }'
```

#### JSON-RPC 协议规范

| 字段 | 说明 | 必需 |
|------|------|------|
| `jsonrpc` | 协议版本，必须是 "2.0" | ✅ |
| `id` | 请求 ID（递增数字） | ✅ |
| `method` | `initialize` / `tools/list` / `tools/call` | ✅ |
| `params.name` | 工具名称（仅 `tools/call`） | - |
| `params.arguments` | 工具参数（仅 `tools/call`） | - |

#### 必需的请求头

```
Authorization: Bearer <your-token>     # 认证令牌
Content-Type: application/json         # 请求内容类型
Accept: application/json               # 响应内容类型（必须！）
mcp-session-id: <session-id>           # 会话 ID（initialize 后必需）
```

#### 常见错误处理

| 错误 | 原因 | 解决方法 |
|------|------|----------|
| `406 Not Acceptable` | 缺少 `Accept` 头 | 添加 `-H "Accept: application/json"` |
| `400 Missing session ID` | 缺少 `mcp-session-id` 头 | 在请求头中包含 session ID |
| `404 Not Found` | 端点路径错误 | 使用 `/mcp` 而不是 `/api/mcp` |

### 调用 REST API 风格的 MCP 工具

```bash
# 直接调用工具端点
node skill.js post <mcp-server-url>/tools/<tool-name> \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  '{"param1": "value1"}'

# GET 请求工具
node skill.js get "<mcp-server-url>/tools/search?query=关键词" \
  -H "Authorization: Bearer <your-token>"
```

## 文件操作

```bash
# 保存响应到文件
node skill.js get <url> -o response.json

# 从文件读取请求体
node skill.js post <url> @request.json

# 上传文件
node skill.js post <url> --file document.pdf
```

## 常见问题

**Q: 为什么 MCP 请求返回 406？**
A: 缺少 `Accept: application/json` 请求头

**Q: 为什么 MCP 请求返回 400 Missing session ID？**
A: JSON-RPC 协议需要在请求头中包含 `mcp-session-id`

**Q: 如何处理 HTTPS 证书错误？**
A: 使用环境变量 `NODE_TLS_REJECT_UNAUTHORIZED=0`（不推荐生产环境）

**Q: 如何设置代理？**
A: 使用环境变量 `HTTP_PROXY` 和 `HTTPS_PROXY`

**Q: 支持哪些认证方式？**
A: Basic Auth、Bearer Token、API Key、OAuth 2.0（通过请求头）

## 环境要求

- Node.js 18 或更高版本
- 不支持 WebSocket
- 不支持浏览器 CORS（运行在服务端）

## 适用场景

- API 测试和调试
- 自动化脚本
- CI/CD 流程
- 数据采集
- MCP 服务器交互
