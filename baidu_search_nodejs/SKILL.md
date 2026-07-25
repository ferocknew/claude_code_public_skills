---
name: baidu-search-nodejs
description: 当用户需要使用百度千帆 AI 搜索（百度 AI Search Engine / BDSE）查询实时网络信息、文档、研究资料，或需要调用百度 qianfan web_search 接口时使用此 skill。Node.js 版本，默认精简 text 输出（摘要+URL），零运行时依赖（Node 18+ 原生 fetch）。
version: 1.0.0
skill_version: 260725.173204
---

# Baidu Search（百度千帆 AI 搜索 / Node.js 版）

本 skill 是 `baidu-search` 的 Node.js 移植版本，通过百度千帆 AI 搜索 API（`/v2/ai_search/web_search`）获取网络搜索结果。基于 Node.js 18+ 原生 `fetch`，零运行时依赖。

## 概述

- 调用百度千帆 AI 搜索 `web_search` 接口，返回结构化搜索引用结果
- **默认输出精简 text（标题 + URL + 摘要 + 日期 + 来源）**，已为 LLM 节省 token 优化
- 拿到 URL 后，建议用 `jina-reader` 等 url 工具读取全文确认
- 支持关键词搜索、结果数量控制、时间范围过滤
- 支持沙盒代理（`DUMATE_*` 环境变量）与直连两种模式

## API Key 配置

本 skill 需要 **BAIDU_API_KEY**。获取地址：

**https://console.bce.baidu.com/ai-search/qianfan/ais/console/apiKey**

- 登录百度智能云，创建或查看已有 API Key（仅需 API Key）
- 复制 API Key 后，通过以下任一方式配置：
  - 环境变量：`export BAIDU_API_KEY="your_api_key"`
  - skill 同目录 `.env` 文件：写入 `BAIDU_API_KEY=your_api_key`
  - 命令行临时覆盖：`node skill.js --api-key "your_api_key"`

## 用法

```bash
# 默认精简 text 输出
node skill.js --query "人工智能"
node skill.js '{"query":"人工智能"}'
node skill.js "旅游景点"

# 精简 JSON / 紧凑 JSON
node skill.js -q "人工智能" --json
node skill.js -q "人工智能" --raw

# 仅 URL（最省 token）/ 完整原始字段
node skill.js -q "人工智能" --no-summary
node skill.js -q "人工智能" --full
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | string | 是 | - | 搜索关键词 |
| count | int | 否 | 10 | 返回结果数量，范围 1-50 |
| freshness | string | 否 | 空 | 时间范围，两种格式见下 |

## freshness 时间范围

支持两种格式：

1. **预设范围**：`pd`、`pw`、`pm`、`py`，分别表示过去 24 小时、7 天、31 天、365 天
2. **日期区间**：`YYYY-MM-DDtoYYYY-MM-DD`，例如 `2025-09-01to2025-09-08`

## 输出格式

默认输出 **精简 text**，每条结果仅含：标题、URL、摘要、日期、来源，URL 单独成行便于提取。示例：

```
找到 3 条结果：
[1] OpenAI 披露一起"前所未有的安全事件"...
    https://www.163.com/dy/article/L2G0UNSH0531G0IB.html
    摘要: OpenAI 与 Hugging Face 联合披露…
    2026-07-23 01:04:27 · 网易
[2] ...
```

| 选项 | 说明 |
|------|------|
| `--json` | 输出精简 JSON（缩进），字段同 text |
| `--raw` | 紧凑 JSON（无缩进），可与 `--json` / `--full` 组合 |
| `--full` | 输出完整原始字段（JSON，含 content 等全部字段） |
| `--no-summary` | 不输出摘要，仅标题+URL（最省 token） |
| `--summary-length N` | 摘要最大字符数，默认 1500（保留完整 content，仅超长截断；0 等同 `--no-summary`） |

> 摘要来源：优先取百度返回的 `snippet`，回退 `content`，折叠空白并按长度截断。默认 1500 字符可保留绝大多数完整摘要，无需二次 curl 即信息完整；仅需页面真正全文（完整代码/数据手册等）时再用 `jina-reader` 等 url 工具。

## 通用选项

| 选项 | 说明 |
|------|------|
| `-q, --query <text>` | 搜索关键词 |
| `-n, --count <int>` | 结果数量 (1-50) |
| `-f, --freshness <value>` | 时间范围过滤 |
| `--timeout <sec>` | 请求超时秒数，默认 30 |
| `--verbose` | 输出调试信息到 stderr |
| `--api-key <key>` | 临时覆盖 BAIDU_API_KEY |
| `-h, --help` | 显示帮助 |
| `-v, --version` | 显示版本 |

## 环境变量

| 变量 | 说明 |
|------|------|
| BAIDU_API_KEY | 百度千帆 API Key（直连模式必需） |
| DUMATE_SESSION_ID | 沙盒会话 ID（沙盒模式） |
| DUMATE_SCHEDULER_URL | 沙盒调度地址（沙盒模式） |

> 同时会自动读取 skill 同目录的 `.env` 文件；进程环境变量优先级高于 `.env`。

## 示例

```bash
# 默认精简 text
node skill.js '{"query":"人工智能"}'
node skill.js -q "最新新闻" -n 5 -f pw

# 日期区间
node skill.js '{"query":"高考","freshness":"2026-06-01to2026-06-10"}'

# 精简 JSON 输出
node skill.js -q "人工智能" --json

# 仅 URL，最大化节省 token
node skill.js -q "旅游景点" -n 10 --no-summary

# 自定义摘要长度
node skill.js -q "人工智能" --summary-length 400

# 完整原始字段（含 content、web_extensions 等全部字段）
node skill.js -q "人工智能" --full
```

## 注意事项

- 需要百度智能云账号并开通 AI 搜索服务，搜索请求会消耗配额。
- 直连模式必须配置 `BAIDU_API_KEY`；沙盒模式由 `DUMATE_SESSION_ID` + `DUMATE_SCHEDULER_URL` 决定。
- 接口返回包含 `code` 字段时视为错误，会抛出 `message`。
- 默认精简输出已去除 `content` 等大字段以节省 token；需要完整字段时使用 `--full`。
- 建议工作流：先用默认 text 获取标题+URL+摘要 → 用 `jina-reader` 等 url 工具按需读取全文。

## 环境要求

- Node.js 18 或更高版本（使用原生 `fetch`）
