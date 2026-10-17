# deepseek-search

DeepSeek 官方 Search / Fetch 接口的命令行工具：一条命令完成联网搜索，或把任意网页抓成 Markdown 正文。零运行时依赖，`node skill.js` 直接可用。

## 这是什么

- **Search**：`POST /v1/tools/search`，按 query 返回网页结果，包含标题、URL、摘要、发布时间、相关度打分与权威性打分。
- **Fetch**：`POST /v1/tools/fetch`，按 URL 返回网页 Markdown 正文。
- 使用与 DeepSeek 模型 API 相同的 API Key（Bearer 鉴权），Key 保存在本地 `.env`，不会进入仓库。

## 能做什么

| 场景 | 说明 |
|------|------|
| 联网搜索 | 关键词、站点限定、语言与时间过滤，一次返回最多 50 条结构化结果 |
| 抓取正文 | 把任意网页转成 Markdown，直接落盘为 `.md` 文件 |
| 结果二次处理 | 默认 table 输出，`--json` 便于管道解析，`--format markdown` 便于粘贴进文档 |
| 质量控制 | 每条结果带 `rerank_score`（相关度）与 `authority`（权威性）打分，便于筛选 |
| 本地化排序 | `--localization <ip>` 让结果优先贴近指定地区 |

## 安装与构建

```bash
cd deepseek-search
pnpm install        # 仅安装构建依赖 esbuild
pnpm run build      # run.js + lib/* -> skill.js
node skill.js --help
```

仓库中已包含打包产物 `skill.js`，因此**不构建也能用**：`node skill.js <command>` 即可运行，无需 `npm install`。

## 首次使用

1. 获取 API Key：打开 <https://platform.deepseek.com/api_keys> 创建（与 DeepSeek 模型 API 共用同一套 Key）。
2. 直接跑联网命令，CLI 检测到 `.env` 中没有 Key 时会主动询问，粘贴后自动写入 `.env`（权限 600），之后所有调用自动复用（`--dry-run` 不发请求、不需要 Key，因此不会触发询问）：

```bash
node skill.js search "DeepSeek 最新更新 lang:zh after:2025"
```

3. 也可以跳过询问，手动写入：

```bash
node skill.js config set-key "<你的 DeepSeek API Key>"
# 或先看路径再手动编辑
node skill.js config path
```

## 命令速查表

| 命令 | 用途 |
|------|------|
| `search <query...>` | 按 query 搜索网页，返回结构化结果 |
| `fetch <url>` | 抓取单个网页，返回 Markdown 正文 |
| `config [show]` | 查看当前配置（key 掩码 / 来源 / .env 路径 / baseUrl / timeout） |
| `config path` | 仅输出 .env 绝对路径 |
| `config set-key <key>` | 把 key 写入 .env（也可 `--key <key>` 或 `--stdin`） |

`config set-key` 的专用选项：`--key <key>`（等价写法 `-k <key>` / `--api-key <key>`），或用 `--stdin` 从管道读取；配合 `--env-file <path>` 可写入指定配置文件。

常用选项：

| 选项 | 说明 | 默认 |
|------|------|------|
| `-k, --api-key <key>` | 本次调用临时使用该 key（不写盘） | 无 |
| `--env-file <path>` | 指定 .env 文件路径（Node 20.6+ 也会解析该拼写：文件不存在时 Node 自身以退出码 9 结束） | `deepseek-search/.env` |
| `--dotenv-file <path>` | `--env-file` 的别名，不与 Node 内置选项冲突；目标文件尚未创建或希望缺失时回退默认 `.env` 时使用 | `deepseek-search/.env` |
| `-n, --count <1-50>` | search 返回条数 | `10` |
| `--content` | search 同时返回网页正文（正文更大） | 关闭 |
| `--ori-question <question>` | 触发搜索的用户原始问题（1~128 字符） | 无 |
| `--localization <ip>` | 用于优先返回本地化搜索结果的 IP 地址 | 无 |
| `-f, --format <table\|json\|markdown>` | 输出格式 | `table` |
| `--json` | 等价于 `--format json` | 关闭 |
| `-o, --out <file>` | fetch 结果写入文件 | 无（打印到 stdout） |
| `--raw` | fetch 只输出纯正文（不带标题） | 关闭 |
| `--stdin` | search 查询词从标准输入读取（`config set-key` 时表示 key 从标准输入读取）；该模式下缺 key 直接以退出码 3 退出，不会用 stdin 询问 key | 关闭 |
| `-t, --timeout <ms>` | 单次请求超时 | `30000` |
| `--dry-run` | 只打印将要发送的 URL 与请求体，不真正请求；不触发首次 Key 询问 | 关闭 |
| `--no-input` | 禁止交互式询问；必须已由 `.env` / 环境变量 / `-k` 提供 key，否则以退出码 3 退出（不会读 stdin） | 关闭 |
| `-h, --help` | 显示帮助 | — |
| `-v, --version` | 显示版本号 | — |

## 示例

```bash
# 搜索 5 条，JSON 输出
node skill.js search "site:github.com DeepSeek" -n 5 --json

# 搜索并同时返回网页正文，结果优先贴近指定 IP 所在地区
node skill.js search "本地天气" --content --localization 1.1.1.1

# 抓取网页并写入 Markdown 文件
node skill.js fetch https://api-docs.deepseek.com/zh-cn/guides/search -o docs.md

# 只输出纯正文（不带标题）
node skill.js fetch https://example.com --raw

# 不真正请求，先看会发什么
node skill.js search "test" --dry-run

# 从标准输入读取 query（适合脚本管道）
echo "DeepSeek lang:zh after:2025" | node skill.js search --stdin
```

## 配置文件说明（.env）

| 变量 | 必需 | 说明 | 默认 |
|------|------|------|------|
| `DEEPSEEK_API_KEY` | 是 | DeepSeek API Key，与模型 API 共用 | 无 |
| `DEEPSEEK_BASE_URL` | 否 | API 基础地址 | `https://api.deepseek.com` |
| `DEEPSEEK_TIMEOUT_MS` | 否 | 单次请求超时（毫秒） | `30000` |
| `DEEPSEEK_NO_PROMPT` | 否 | 设为 1 时禁止交互式询问 | 未设置（允许询问） |

`.env` 默认位于 `deepseek-search/.env`，可用 `--env-file <path>` 指定其他位置；模板见 `.env.example`。

## 计费与限速

- 按**成功请求次数**计费：每 1000 次 5 元。
- 只有 HTTP 200 且产生结果才计费（search 的 `results` 必须非空）；失败、无结果、超时均不计费。
- `--count` 只影响返回条数，不影响单价。
- Search 与 Fetch **各自 5 QPS**，按账号维度计算（与用哪个 key 无关）；Fetch 对目标域名另有 QPS 限制。
- 在 DeepSeek Harness / Claude Code / Codex 中通过服务端工具调用 Search / Fetch 目前未计费；官方文档说明自 **2026-11-01 00:00（北京时间）** 起按次收费（来源：<https://api-docs.deepseek.com/zh-cn/guides/search> ）。

## 常见问题

**Q：第一次运行会不会卡住等待输入？**
A：交互式终端下会询问 Key（这正是首次使用的配置方式）；脚本 / CI 请加 `--no-input` 或设 `DEEPSEEK_NO_PROMPT=1`——它只表示禁止交互询问，不会从 stdin 读取 Key，因此必须已由 `.env` / 环境变量 / `-k` 提供 Key，否则直接以退出码 3 退出。
用 `--stdin` 从管道传查询词时，Key 不能在同一个管道里给。

**Q：怎么换 Key？**
A：`node skill.js config set-key <新key>` 覆盖写入，或直接编辑 `.env`；临时替换可用 `--api-key <新key>`。

**Q：结果只有 10 条，怎么要更多？**
A：`-n 30`（上限 50）。需要正文时加 `--content`，注意正文体积明显更大。

**Q：搜索没结果但报了错，会被计费吗？**
A：不会。只有 200 且 `results` 非空才计费，空结果、4xx、超时都不计费。

**Q：同一个 query 多次执行会重复计费吗？**
A：会，每次成功请求都算一次。调试语法时先用 `--dry-run` 确认请求内容。

## 隐私说明

- `.env`、`node_modules/`、`*.log`、`demo/`、`test/` 已写入 `.gitignore`，不会提交到 git。
- `.env.example` 只有占位符，真实 Key 永不入库、永不硬编码。
- `config` 输出中的 Key 一律掩码显示，日志与错误信息也不会打印完整 Key。