# HTTP MCP 工具

一个基于 Node.js 原生 `fetch` API 的跨平台 HTTP 请求工具。无需额外依赖，支持各种 HTTP 方法和认证方式。

## 特性

- ✅ **零运行时依赖**：使用 Node.js 18+ 内置 fetch API
- ✅ **支持所有 HTTP 方法**：GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS
- ✅ **多种认证方式**：Basic Auth、Bearer Token、API Key
- ✅ **MCP 服务器支持**：获取 MCP 工具列表、调用 MCP 工具
- ✅ **文件操作**：上传、下载、从文件读取请求体
- ✅ **调试友好**：显示请求/响应详情、生成 curl 命令
- ✅ **跨平台**：Windows、macOS、Linux

## 安装

```bash
# 克隆仓库
cd use_http_mcp

# 安装开发依赖（用于打包）
pnpm install

# 或者直接使用（需要 Node.js 18+）
node run.js get https://api.example.com/users
```

## 快速开始

### 基本用法

```bash
# GET 请求
node run.js get https://api.example.com/users/nodejs

# POST JSON
node run.js post https://api.example.com/users '{"name": "张三"}'

# 带认证
node run.js get https://api.example.com/protected -u <user>:<pass>

# 保存响应
node run.js get https://api.example.com/data -o output.json
```

### MCP 服务器支持

```bash
# 获取 MCP 工具列表
node run.js get <mcp-server-url> -b <your-token> --mcp-tools

# 调用 MCP 工具
node run.js post <mcp-server-url>/tools/<tool-name> \
  -H "Authorization: Bearer <your-token>" \
  '{"param": "value"}'
```

## 命令行选项

| 选项 | 说明 |
|------|------|
| `-H, --header <k> <v>` | 添加请求头 |
| `-u, --user <user:pass>` | Basic Auth |
| `-b, --bearer <token>` | Bearer Token |
| `-o, --output <file>` | 保存响应到文件 |
| `-i, --include` | 显示响应头 |
| `-v, --verbose` | 完整调试模式 |
| `-f, --form <data>` | 表单数据 |
| `--file <path>` | 上传文件 |
| `--timeout <sec>` | 请求超时（默认 30 秒） |
| `--curl` | 显示 curl 等价命令 |
| `--mcp-tools` | 获取 MCP 服务器工具列表 |

## MCP 服务器使用

### 支持的 MCP 服务器

本工具支持任何符合 MCP 协议的 HTTP 服务器，包括：
- REST API 风格的 MCP 服务器
- MCP JSON-RPC 协议服务器

参考 `sessions/` 目录中的配置示例。

### 获取 MCP 工具列表

```bash
# REST API 风格
node run.js get <mcp-server-url>/mcp \
  -H "Authorization: Bearer <your-token>" \
  --mcp-tools

# JSON-RPC 风格（需要先初始化获取 session ID）
node run.js post <mcp-server-url>/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -i \
  '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "use-http-mcp", "version": "1.0.0"}}}'
```

### 调用 MCP 工具

```bash
# REST API 风格
node run.js post <mcp-server-url>/tools/<tool-name> \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  '{"param": "value"}'

# JSON-RPC 风格（需要 session ID）
node run.js post <mcp-server-url>/mcp \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "mcp-session-id: <session-id>" \
  '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "<tool-name>", "arguments": {"query": "<搜索关键词>"}}}'
```

## 打包

```bash
# 生成独立的 skill.js（包含所有代码）
pnpm run build

# 使用打包后的文件
node skill.js get https://api.example.com/users
```

## 目录结构

```
use_http_mcp/
├── SKILL.md          # 技能定义（LLM 使用）
├── CLAUDE.md         # 开发指引
├── README.md         # 本文件
├── package.json      # 依赖配置
├── build.js          # 打包脚本
├── run.js            # 主入口文件
├── skill.js          # 打包后的独立文件
├── mcp_list/         # MCP 服务器配置
│   └── search.json
└── sessions/         # MCP 会话配置
    ├── README.md
    ├── searxng-mcp.json
    └── memory-mcp.json
```

## 许可

MIT
