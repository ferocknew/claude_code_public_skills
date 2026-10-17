---
name: deepseek-search
description: 当用户要求「网络搜索」「联网查询」「实时信息搜索」「搜索最新资料」「抓取网页正文」「读取某个 URL 的 Markdown 正文」「DeepSeek 搜索」时使用此 skill。基于 DeepSeek 官方 Search / Fetch 接口（Bearer 鉴权，key 存于 .env），返回带 URL、摘要、发布时间与权威性打分的结构化结果，或把网页抓成 Markdown。
skill_version: 261017.194057
---

# deepseek-search

DeepSeek 官方 Search / Fetch 接口的零依赖 CLI：一条命令完成联网搜索，或把任意网页抓成 Markdown 正文，结果是带 URL、摘要、发布时间、权威性打分与相关度打分的结构化字段。

**运行方式（无需安装依赖）：**

```bash
node skill.js <command> [args] [options]
```

## 快速开始

```bash
# 1. 首次使用：直接运行，缺 key 时会主动询问并写入 .env
node skill.js search "DeepSeek 最新更新 lang:zh after:2025"

# 2. 手动写入 key（等价于首次询问）
node skill.js config set-key "<你的 DeepSeek API Key>"

# 3. 抓取单个网页为 Markdown 正文
node skill.js fetch https://api-docs.deepseek.com/zh-cn/guides/search

# 4. 搜索 5 条 + JSON 输出 + 同时返回网页正文
node skill.js search "site:github.com DeepSeek" -n 5 --json --content

# 5. 查看当前配置 / 仅查看 .env 路径
node skill.js config
node skill.js config path
```

## 首次使用与 API Key

- **第一次运行**任何联网命令时，若 `.env` 中没有 key，CLI 会**主动询问**：粘贴 key 后立即写入 `.env`（默认 `deepseek-search/.env`，权限 600），之后所有调用自动复用，不需要重复输入。
- 也可以不用询问，手动配置：
  - 直接编辑 `.env`，写入 `DEEPSEEK_API_KEY=...`；
  - 或 `node skill.js config set-key <key>`（同样支持 `--key <key>` 与 `--stdin`）；
  - 或临时用环境变量 `DEEPSEEK_API_KEY`、选项 `-k/--api-key <key>`（只对本次调用生效，不写盘）。
- key 来源：DeepSeek 开放平台 <https://platform.deepseek.com/api_keys> ，与 DeepSeek 模型 API 是**同一套 key**（Bearer 鉴权）。
- **安全约定**：`.env` 已被 `.gitignore` 忽略，**绝不入库**；文档、示例、源码中**绝不硬编码**真实 key；`config` 输出的 key 一律掩码。
- 脚本 / CI 场景请加 `--no-input`（或设 `DEEPSEEK_NO_PROMPT=1`）：它只表示**禁止交互询问**，不会从 stdin 读取 key。
  因此必须已经通过 `.env` / 环境变量 `DEEPSEEK_API_KEY` / `-k, --api-key` 提供 key，否则直接以退出码 3 退出。
- 用 `--stdin` 把查询词从管道传入时，key 不能在同一个管道里给：缺 key 会直接以退出码 3 退出，请配合 `-k` / `.env` / `--env-file`。

## 命令总表

| 命令 | 用途 | 示例 |
|------|------|------|
| `search <query...>` | 按 query 搜索网页，返回结构化结果 | `node skill.js search "DeepSeek 模型 site:github.com lang:zh after:2025"` |
| `fetch <url>` | 抓取单个网页，返回 Markdown 正文 | `node skill.js fetch https://api-docs.deepseek.com/zh-cn/guides/search` |
| `config [show]` | 查看当前配置（key 掩码 / 来源 / .env 路径 / baseUrl / timeout） | `node skill.js config` |
| `config path` | 仅输出 .env 绝对路径 | `node skill.js config path` |
| `config set-key <key>` | 把 key 写入 .env（也可 `--key <key>` 或 `--stdin`） | `node skill.js config set-key "<你的 DeepSeek API Key>"` |

`config set-key` 的专用选项：`--key <key>`（等价写法 `-k <key>` / `--api-key <key>`），或用 `--stdin` 从管道读取；
配合 `--env-file <path>` / `--dotenv-file <path>` 可写入指定的配置文件而不是默认 `.env`（目标文件还不存在时必须用 `--dotenv-file`）。

## 选项表

| 选项 | 说明 | 默认 |
|------|------|------|
| `-k, --api-key <key>` | 本次调用临时使用该 key（不写盘） | 无（回退到 .env / 环境变量） |
| `--env-file <path>` | 指定 .env 文件路径（Node 20.6+ 也会解析这个拼写：文件不存在时 Node 自身以 9 退出） | `deepseek-search/.env` |
| `--dotenv-file <path>` | `--env-file` 的别名，不与 Node 内置选项冲突；**目标文件尚未创建**（如 `config set-key --dotenv-file <新文件>`）或想让缺失文件回退默认 `.env` 时用它 | `deepseek-search/.env` |
| `-n, --count <1-50>` | search 返回条数（仅 search） | `10` |
| `--content` | search 同时返回网页正文（`need_content=true`，正文更大） | 关闭 |
| `--ori-question <question>` | 触发搜索的用户原始问题，帮助理解意图（1~128 字符） | 无 |
| `--localization <ip>` | 用于优先返回本地化搜索结果的 IP 地址 | 无 |
| `-f, --format <table\|json\|markdown>` | 输出格式 | `table` |
| `--json` | 等价于 `--format json` | 关闭 |
| `-o, --out <file>` | fetch 结果写入文件（仅 fetch） | 无（打印到 stdout） |
| `--raw` | fetch 只输出纯正文（不带标题） | 关闭 |
| `--stdin` | search 查询词从标准输入读取（`config set-key` 时表示 key 从标准输入读取）。该模式下缺 key 直接以退出码 3 退出，不会用 stdin 询问 key | 关闭 |
| `-t, --timeout <ms>` | 单次请求超时 | `30000` |
| `--dry-run` | 只打印将要发送的 URL 与请求体，不真正请求；因不需要 key，也不会触发首次询问 | 关闭 |
| `--no-input` | 禁止交互式询问；必须已由 `.env` / 环境变量 / `-k` 提供 key，否则以退出码 3 退出（不会读 stdin） | 关闭（缺 key 时交互询问） |
| `-h, --help` | 显示帮助 | — |
| `-v, --version` | 显示版本号 | — |

## 搜索语法速查

| 语法 | 说明 | 示例 |
|------|------|------|
| `site:` | 限定站点 | `site:github.com` |
| `-site:` | 排除站点 | `-site:example.com` |
| `-` | 排除关键词 | `DeepSeek -广告` |
| `-"短语"` | 排除短语 | `-"相关搜索"` |
| `"精确短语"` | 精确匹配 | `"长文本上下文"` |
| `lang:zh,en` | 限定语言，逗号分隔 | `lang:zh,en` |
| `after:2025` / `after:2025-01-01` | 只保留该时间之后的内容 | `after:2025-01-01` |
| `before:2026` / `before:2026-06-01` | 只保留该时间之前的内容 | `before:2026-06-01` |

以上语法可以组合使用，例如：

```bash
node skill.js search "DeepSeek 模型 site:github.com OR site:huggingface.co lang:zh after:2025"
```

## 输出与字段说明

默认输出格式为 `table`（终端阅读友好）；`-f json` / `--json` 适合管道与程序解析，`-f markdown` 适合直接粘贴进文档。

**search 结果字段：**

| 字段 | 含义 |
|------|------|
| `title` | 网页标题 |
| `url` | 网页地址 |
| `snippet` | 短摘要（100~200 字符） |
| `summary` | 长摘要（600~800 字符） |
| `content` | 网页正文；未加 `--content`（`need_content=false`）时为空串 |
| `site_name` | 站点名称 |
| `site_icon` | 站点图标 URL |
| `date` | 发布时间，UTC RFC 3339；未知时为 `null` |
| `rerank_score` | 相关度打分 0~3，`>= 1.5` 为优质结果 |
| `authority` | 权威性打分 0~4，`-1` 表示未知，`>= 3` 为极权威 |

**fetch 结果字段：** `title`、`content`（Markdown 正文）；加 `--raw` 只输出 `content`。

**HTTP 错误码与处理建议：**

| 码 | 含义 | 处理建议 |
|----|------|----------|
| 400 | 请求不合法 | 修正参数（query 1~128 字符、url 必须含 host）后重试 |
| 401 | key 缺失或无效 | 用 `config set-key` 重新配置 key |
| 402 | 余额不足 | 需充值，重试无用 |
| 403 | Fetch 被安全策略拒绝 | 换目标 URL，不要重试 |
| 404 | Fetch 未取到可用内容 | 换目标 URL，不要重试 |
| 408 | 读请求体超时 | 可等待后重试 |
| 413 | 请求体过大 | 精简请求（如降低 `--count`）后重试 |
| 429 | 超过 QPS（Search / Fetch 各自 5 QPS） | 退避后重试 |
| 500 | 服务端错误 | 可等待后重试 |
| 504 | 下游超时 | 可等待后重试 |

408 / 429 / 5xx 可等待重试；402 需充值；其他 4xx 不要重试。错误统一输出为 `{"error": "...", "message": "..."}` JSON。

**退出码：**

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | API 或运行时错误 |
| 2 | 用法错误 |
| 3 | 缺少 API Key |

## 计费与限速

- 按**成功请求次数**计费：每 1000 次 5 元。
- 只有 HTTP 200 且产生结果才计费（search 的 `results` 必须非空）；失败、无结果、超时都**不计费**。
- `count` 只影响返回条数，不影响单价。
- Search 与 Fetch **各自 5 QPS**，按账号维度计算（与用哪个 key 无关）；Fetch 对目标域名另有 QPS 限制。
- 在 DeepSeek Harness / Claude Code / Codex 中通过服务端工具调用 Search / Fetch，目前**未计费**；官方文档说明自 **2026-11-01 00:00（北京时间）** 起按次收费（来源：<https://api-docs.deepseek.com/zh-cn/guides/search> ）。

## 常见问题

**Q1：key 从哪来？**
A：DeepSeek 开放平台 <https://platform.deepseek.com/api_keys> 创建，与 DeepSeek 模型 API 共用同一套 key，无需另外申请。

**Q2：`.env` 会不会被提交到 git？**
A：不会。`.env` 已被本目录与仓库根两处 `.gitignore` 忽略，CLI 写入的 key 只落在 `.env`，不会进入源码、文档或打包产物。

**Q3：怎么换 key？**
A：三选一：`node skill.js config set-key <新key>` 覆盖写入；直接编辑 `.env` 里的 `DEEPSEEK_API_KEY`；或用 `--api-key <新key>` / 环境变量临时覆盖本次调用。

**Q4：搜索结果为空，为什么没收费？**
A：只有 HTTP 200 且 `results` 非空才算成功请求并计费，空结果、失败、超时都不计费（仍占用 QPS 额度）。结果为空时可放宽条件（去掉 `site:` 或时间限定）后重试。

**Q5：和 DeepSeek Harness / Claude Code 内置搜索是什么关系？**
A：内置搜索走服务端工具调用；本 skill 直接调用 DeepSeek 官方 Search / Fetch 接口，字段更全（`date`、`authority`、`rerank_score`），可脚本化、可导出文件。服务端工具调用目前未计费，自 2026-11-01 00:00（北京时间）起按次收费（来源：官方文档）。

详细案例见 `examples/`（可选）。