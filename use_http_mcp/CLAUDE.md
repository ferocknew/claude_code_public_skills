# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 文档说明

本项目包含 3 个核心文档，各自有不同的功能定位：

| 文件 | 功能定位 | 目标读者 |
|------|----------|----------|
| **SKILL.md** | 告诉 LLM 如何使用这个 skill | Claude AI (LLM) |
| **CLAUDE.md** | AI 开发工具的指引，包含项目架构和开发规范 | Claude Code (开发助手) |
| **README.md** | skill 的完整使用说明文档 | 用户 |

---

## 项目概述

这是一个基于 Node.js 原生 `fetch` API 的 HTTP 请求命令行工具，用于发送 HTTP 请求、调用 REST API、测试接口。核心特点是**无需额外依赖**，使用 Node.js 18+ 内置的 fetch API。

### 核心功能

- 支持 GET/POST/PUT/DELETE/PATCH 等 HTTP 方法
- 处理 JSON 数据和表单数据
- 支持 Basic Auth、Bearer Token、API Key 等认证
- 文件上传/下载
- 显示响应头和调试信息
- **MCP 服务器支持**：获取工具列表、调用 MCP 工具

---

## 常用命令

### 安装依赖
```bash
pnpm install
```

### 运行主工具
```bash
# GET 请求
node run.js get https://api.example.com/users

# POST 请求
node run.js post https://api.example.com/users '{"name": "张三"}'

# 带认证
node run.js get https://api.example.com/protected -u admin:123456

# 保存响应
node run.js get https://api.example.com/data -o output.json
```

### MCP 操作
```bash
# 获取 MCP 工具列表
node run.js get <mcp-server-url> -b <token> --mcp-tools

# 调用 MCP 工具
node run.js post <mcp-server-url>/tools/<tool-name> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  '{"param": "value"}'
```

### 打包
```bash
# 生成 skill.js
pnpm run build
```

---

## 核心架构

### 主入口文件
- `run.js` - 跨平台主脚本，支持各种 HTTP 方法和选项
- 新增 `--mcp-tools` 选项用于获取 MCP 服务器工具列表

### 依赖
- **无运行时依赖**：使用 Node.js 18+ 内置的 fetch API
- **开发依赖**：esbuild（用于打包）

### 请求选项

```javascript
const options = {
  method: 'GET',           // HTTP 方法
  url: 'https://...',      // 目标 URL
  headers: {},             // 请求头
  body: null,              // 请求体
  output: null,            // 输出文件
  include: false,          // 显示响应头
  verbose: false,          // 完整调试模式
  isForm: false,           // 表单数据
  file: null,              // 上传文件
  timeout: 30,             // 超时（秒）
  showCurl: false,         // 显示 curl 命令
  mcpTools: false,         // 获取 MCP 工具列表
};
```

---

## 开发规范

### 代码风格
1. 使用 async/await 处理 fetch Promise
2. 所有选项使用短横线命名（-H, -u, -b）
3. 错误处理要友好且具体
4. 响应格式尽量可读

### 版本号规则
**打包文件版本号格式：YYMMDD.HHmmSS**
- 由 `build.js` 自动生成并注入到打包文件
- 同时更新 SKILL.md 中的 `skill_version` 字段

### MCP 工具列表获取逻辑

```javascript
async function getMcpTools(options) {
  // 方法 1: 尝试 GET /api/mcp (SearXNG 风格)
  let response = await fetch(`${baseUrl}/api/mcp`, { headers });
  if (response.ok) return displayMcpTools(await response.json());

  // 方法 2: 尝试 MCP JSON-RPC 协议
  await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { ... }
    })
  });

  // 方法 3: 尝试从 OpenAPI.json 推断
  response = await fetch(`${baseUrl}/openapi.json`);
  if (response.ok) return displayOpenApiTools(await response.json());
}
```

---

## 目录结构

```
use_http_mcp/
├── SKILL.md              # 技能定义（LLM 使用）
├── CLAUDE.md             # 本文件
├── README.md             # 用户文档
├── package.json          # 依赖配置
├── build.js              # 打包脚本
├── run.js                # 主入口文件
├── run.sh / run.bat      # 启动脚本
├── skill.js              # 打包后的独立文件（无依赖）
├── mcp_list/             # MCP 服务器原始配置
│   └── search.json       # SearXNG MCP 配置示例
└── sessions/             # MCP 会话配置目录
    ├── README.md         # 目录说明
    ├── searxng-mcp.json  # SearXNG MCP 工具列表
    └── memory-mcp.json   # Memory MCP 工具列表
```

### mcp_list 目录

存储 MCP 服务器的原始配置信息，用于连接和认证。格式示例：

```json
{
  "headers": {
    "Authorization": "Bearer your-token"
  },
  "type": "http",
  "url": "https://mcp-server.com/mcp"
}
```

### sessions 目录

存储 MCP 服务器的会话配置和工具列表，包含：
- 服务器基本信息
- 认证方式
- 可用工具列表及其参数说明

---

## MCP 服务器支持

本工具支持多种 MCP 服务器实现方式：

### 1. REST API 风格（如 SearXNG）
- 提供 `/api/mcp` 端点获取工具列表
- 每个工具对应一个 HTTP 端点
- 使用标准 HTTP 方法调用

### 2. MCP JSON-RPC 风格
- 使用 `/mcp` 端点
- 遵循 MCP 协议规范
- 需要 `initialize` + `tools/list` 流程

### 3. OpenAPI 风格（如 Memory）
- 提供 `/openapi.json` 规范
- 工具位于 `/tools/*` 路径下
- 从 OpenAPI 规范推断工具列表

---

## 与 excel-alasql 的对应关系

| excel-alasql | use_http_mcp |
|--------------|--------------|
| 读取 Excel | 发送 HTTP 请求 |
| SQL 查询 | REST API 调用 / MCP 工具调用 |
| 导出 JSON | 保存响应体 |
| 列名映射 | 请求头/响应头处理 |
| 数据分析 | MCP 工具列表获取 |
