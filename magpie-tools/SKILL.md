---
name: magpie-tools
description: 当用户需要“Magpie 插件工具”、“网页搜索”、“网页抓取”、“网站流量查询”、“域名权重 DR/反链”、“关键词难度/搜索量/建议”、“Google/Bing/YouTube 自动补全”、“Google Trends”、“查询 goanyapi/search1api credits 余额”时使用此 skill。
skill_version: 261031.001406
---

# magpie-tools

Magpie 网关 MCP 插件工具的零依赖 CLI：通过网关 MCP streamable HTTP 端点（无状态直调）列出并调用 `search1api_*`（网页搜索、新闻、网页抓取）与 `goanyapi_*`（网站流量、域名权重 DR/反链、关键词难度/搜索量/建议、Google/Bing/YouTube 自动补全、credits 余额等）两组插件工具。

**运行方式（无需安装依赖）：**

```bash
node skill.js <command> [args] [options]
```

## 快速开始

```bash
# 1. 列出当前可用的全部工具（工具清单随网关插件开关变化）
node skill.js list

# 2. 按关键词过滤工具（名称或描述，不区分大小写）
node skill.js list credits

# 3. 查询 goanyapi credits 余额（部分工具消耗 credits，先看余额）
node skill.js call goanyapi_credits_balance

# 4. 调用带参数的工具：--arg k=v 可重复，值自动尝试 JSON 解析
node skill.js call search1api_search --arg query=deepseek --arg maxResults=5

# 5. 复杂参数用 --args 一次传入完整 JSON 对象
node skill.js call search1api_search --args '{"query":"deepseek","maxResults":5}' --json
```

## 命令总表

| 命令 | 用途 | 示例 |
|------|------|------|
| `list` | 表格列出全部工具：名称、必填参数、描述 | `node skill.js list` |
| `list <关键词>` | 过滤名称或描述含关键词的工具（不区分大小写） | `node skill.js list credits` |
| `list --json` | 输出原始 tools 数组 JSON | `node skill.js list --json` |
| `call <tool>` | 调用指定工具；无参数工具直接调用 | `node skill.js call goanyapi_credits_balance` |
| `call <tool> --arg k=v` | 逐个传参，可重复；值先尝试 JSON 解析，失败按字符串 | `node skill.js call search1api_search --arg query=deepseek` |
| `call <tool> --args '<JSON>'` | 一次性传完整参数对象；与 `--arg` 混用时 `--arg` 优先 | `node skill.js call <tool> --args '{"query":"x"}'` |
| `--help` / `--version` | 显示帮助 / 版本号 | `node skill.js --help` |

## 选项表

| 选项 | 说明 | 默认 |
|------|------|------|
| `--arg <k=v>` | call 参数，可重复；值先尝试 JSON.parse（`maxResults=5` 得数字、`includeSites='["a","b"]'` 得数组），失败按原样字符串；后到者优先 | 无 |
| `--args '<JSON对象>'` | 一次性传入完整参数对象（必须是 JSON 对象字面量）；与 `--arg` 混用时 `--arg` 后到者优先 | 无 |
| `--json` | `list` 输出原始 tools 数组；`call` 输出解包后的完整结果对象（含 content 与 structuredContent） | 关闭 |
| `--timeout <ms>` | 单次请求超时毫秒 | `MAGPIE_TIMEOUT_MS` 或 `60000` |
| `-h, --help` | 显示帮助 | — |
| `-v, --version` | 显示版本号 | — |

## 认证与配置

配置优先级：命令行选项 > 环境变量 > `.env` > 默认值。`.env` 位于技能目录（已被 .gitignore 忽略，不入库），模板见 `.env.example`。

| 环境变量 | 说明 | 默认值 |
|----------|------|--------|
| `MAGPIE_TOOLS_URL` | Magpie 网关 MCP 插件工具端点（streamable HTTP，无状态） | `http://localhost:3425/mcp/magpie/tools` |
| `MAGPIE_API_KEY` | Magpie 网关密钥（必需，缺失时以退出码 3 报错） | 无 |
| `MAGPIE_TIMEOUT_MS` | 默认请求超时毫秒 | `60000` |

## 输出说明

- `call` 默认输出：网关会把插件结果二次 JSON.stringify 后塞进 `result.content[0].text`，本 CLI 自动再解析一层——解析成功则优先输出 `structuredContent`（机器可读数据），否则输出 `content` 中的文本；解析失败原样输出 text。
- `call --json` 输出解包后的完整结果对象（`content` + `structuredContent`），适合程序解析。
- 工具执行错误（`isError: true`）、鉴权失败（401）、未知工具（JSON-RPC -32602）统一以 `{"error", "message"}` JSON 输出到 stderr。

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | API 或运行时错误（连接失败、HTTP 错误、工具执行错误） |
| 2 | 用法错误（未知命令、缺参数、--args/--arg 格式错误） |
| 3 | 缺少 API Key |

## 常见问题与避坑

**Q1：需要先 MCP initialize 握手吗？**

A：不需要。该端点是 streamable HTTP 的无状态直调模式，直接 POST `tools/list` / `tools/call` 即可，响应为 application/json（非 SSE）。

**Q2：call 报 "unknown tool xxx" 是什么意思？**

A：工具名格式为 `<插件>_<工具>`（`search1api_*` 与 `goanyapi_*`），且**工具清单随网关插件开关变化**。先 `node skill.js list` 确认当前可用工具名，再 call。

**Q3：哪些工具消耗 credits？**

A：goanyapi 系列多数工具按次消耗 goanyapi credits。可先 `node skill.js call goanyapi_credits_balance` 查询余额，再决定是否调用付费工具。

**Q4：为什么返回 401 鉴权失败？**

A：`MAGPIE_API_KEY` 缺失或不是已启用的 Magpie 网关密钥。检查 `.env` 或环境变量中的密钥配置。

**Q5：`--arg` 传的数字变成了字符串（或反过来）？**

A：`--arg` 的值先尝试 JSON 解析：`k=5` 得数字 5；需要保留 "005"、"1.0.0" 这类字符串时，改用 `--args '{"k":"005"}'` 显式声明类型。
