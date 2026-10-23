---
name: hindsight
description: 当用户要求「记住这件事」「保存到长期记忆」「回忆 / 检索之前记录的内容」「列出、查看、修改或作废记忆」「查看心智模型（mental model）」「调用 Hindsight MCP 工具」时使用此 skill。把 Hindsight MCP 封装为零依赖 CLI：异步写入 retain、检索 recall、浏览与维护（list-memories / get-memory / update-memory / invalidate-memory）与心智模型列表；不提供 sync-retain 与 reflect。
skill_version: 261024.000401
---

# hindsight

Hindsight 长期记忆服务的零依赖 CLI：一条命令完成记忆写入、语义检索与记忆维护。命令名与 MCP 工具对应，适合脚本化调用，也适合 LLM 直接执行。

**运行方式（无需安装依赖）：**

```bash
node skill.js <command> [args] [options]
```

## 快速开始

```bash
# 1) 配置：把 .env.example 复制为 .env 并填入真实端点与令牌
#    .env 已被 .gitignore 忽略，不会提交
cp .env.example .env

# 2) 查看服务端实际暴露的工具（只读）
node skill.js tools

# 3) 写入一条记忆（写操作）与检索（只读）
node skill.js retain "用户偏好：回答使用简体中文" --tags preference,language
node skill.js recall "用户语言偏好" --max-tokens 2048

# 4) 浏览与查看
node skill.js list-memories --limit 20 --format table
node skill.js get-memory <memory_id>

# 5) 维护：修改 / 软作废 / 恢复（均为写操作）
node skill.js update-memory <memory_id> --text "修正后的内容"
node skill.js invalidate-memory <memory_id> --reason "内容已过时"
node skill.js invalidate-memory <memory_id> --restore
```

> `retain` / `update-memory` / `invalidate-memory` 会修改真实的长期记忆，执行前确认写入内容与目标 `memory_id`。`invalidate-memory` 是软作废，可用 `--restore` 恢复。
>
> **写入约定：只提供异步 `retain`，不提供同步写入 `sync-retain`。**
>
> `retain` 返回 `status: accepted` 仅表示服务端已受理；落库与可检索存在延迟（本次实测约 45 秒，时长由服务端决定）。

## 命令总表

| 命令 | 作用 | 写操作 | 常用选项 |
|------|------|--------|----------|
| `retain <内容>` | 写入一条记忆（异步） | 是 | `--context` `--tags` `--metadata` `--document-id` `--strategy` `--update-mode` `--content-file` |
| `recall <查询词>` | 语义检索相关记忆 | 否 | `--max-tokens` `--budget` `--types` `--tags` `--tags-match` `--prefer-observations` |
| `list-memories` | 分页浏览记忆 | 否 | `--type` `-q/--query` `--limit` `--offset` `--tags` `--tags-match` |
| `get-memory <memory_id>` | 查看单条记忆 | 否 | 无 |
| `update-memory <memory_id>` | 修改单条记忆 | 是 | `--text` `--context` `--occurred-start` `--occurred-end` `--fact-type` `--entities` `--no-resolve-entities` |
| `invalidate-memory <memory_id>` | 软作废 / 恢复单条记忆 | 是 | `--reason` `--restore` |
| `list-mental-models` | 列出心智模型 | 否 | `--tags` `--limit` `--offset` |
| `tools` | 列出服务端工具、首行描述、必填参数 | 否 | 无 |
| `call <tool>` | 通用兜底调用任意工具 | 取决于工具 | `--args <JSON>` / `--args-file <路径>` |

服务端当前暴露 9 个工具：`retain`、`sync_retain`、`recall`、`reflect`、`list_mental_models`、`list_memories`、`get_memory`、`update_memory`、`invalidate_memory`。本 skill 封装其中 7 个，**不封装 `sync_retain`（同步写入）与 `reflect`**（服务端综合耗时超过反代 60 秒，CLI 与 MCP 直连均稳定超时）；其余工具可用 `call` 调用。
**`get_mental_model`（单条心智模型查询）未暴露**，只能列出，不能按 id 取单条。

## 选项表

### 全局选项

| 选项 | 说明 | 默认 |
|------|------|------|
| `--url <地址>` | 覆盖 `HINDSIGHT_MCP_URL` | 取环境变量 / `.env` |
| `--token <令牌>` | 覆盖 `HINDSIGHT_TOKEN` | 取环境变量 / `.env` |
| `--format <json\|table>` | 输出格式 | `json` |
| `--dotenv-file <路径>` | 指定 `.env` 文件 | 依次查当前目录、skill 目录 |
| `-h, --help` | 显示帮助 | — |
| `-v, --version` | 显示版本号 | — |

### 命令选项

| 选项 | 适用命令 | 说明 | 默认 |
|------|----------|------|------|
| `--context <文本>` | retain | 记忆的上下文 | `general` |
| `--timestamp <时间>` | retain | 记忆发生时间（ISO 8601） | 服务端当前时间 |
| `--tags <a,b>` | 写入、检索、列表、心智模型 | 逗号分隔的标签 | 无 |
| `--metadata <JSON>` | retain | 元数据对象（值建议用字符串） | 无 |
| `--document-id <id>` | retain | 关联文档 ID | 无 |
| `--strategy <名称>` | retain | 写入策略 | 服务端默认 |
| `--update-mode <模式>` | retain | 更新模式 | 服务端默认 |
| `--content-file <路径>` | retain | 从文件读取内容，`-` 表示 stdin | 无 |
| `--max-tokens <n>` | recall | 返回内容 token 上限 | `4096` |
| `--budget <级别>` | recall | 检索预算 | `high` |
| `--types <a,b>` | recall | 记忆类型：`world` / `experience` / `observation` | 全部 |
| `--prefer-observations` | recall | 优先返回 observation | 关闭 |
| `--tags-match <模式>` | recall / list-memories | `any` / `all` / `any_strict` / `all_strict` / `exact` | `any` |
| `--tag-groups <JSON>` | recall | 标签组过滤（JSON 数组） | 无 |
| `--query-timestamp <时间>` | recall | 查询时间点（ISO 8601） | 无 |
| `--min-scores <JSON>` | recall | 各维度最低分（JSON 对象） | 无 |
| `--temporal-window <JSON>` | recall | 时间窗口（JSON 对象） | 无 |
| `--type <类型>` | list-memories | `world` / `experience` / `observation` | 全部 |
| `-q, --query <关键字>` | list-memories | 按关键字过滤 | 无 |
| `--limit <n>` | list-memories / list-mental-models | 条数上限 | `100`（心智模型范围 1~1000） |
| `--offset <n>` | list-memories / list-mental-models | 偏移量 | `0` |
| `--text <文本>` | update-memory | 新的记忆文本 | 不修改 |
| `--occurred-start/--occurred-end <时间>` | update-memory | 发生时间范围 | 不修改 |
| `--fact-type <类型>` | update-memory | 事实类型 | 不修改 |
| `--entities <a,b>` | update-memory | 实体列表 | 不修改 |
| `--resolve-entities [布尔]` | update-memory | 是否解析实体 | `true` |
| `--no-resolve-entities` | update-memory | 等价于 `--resolve-entities false` | — |
| `--reason <文本>` | invalidate-memory | 作废原因 | 无 |
| `--restore` | invalidate-memory | 恢复已作废记忆 | 关闭 |
| `--args <JSON>` / `--args-file <路径>` | call | 工具参数，二选一；文件可用 `-` 读 stdin | `{}` |

完整帮助随时可用 `node skill.js --help` 查看。

## 认证与配置

| 环境变量 | 说明 | 默认 |
|----------|------|------|
| `HINDSIGHT_MCP_URL` | 完整 MCP 端点 URL，必须已包含 `/mcp/<bank>` | 无（必需） |
| `HINDSIGHT_TOKEN` | 访问令牌，自动拼成 `Authorization: Bearer <token>` | 无（与下一项二选一） |
| `HINDSIGHT_AUTH_HEADER` | 完整 `Authorization` 头值，设置后优先于 token | 无 |
| `HINDSIGHT_TIMEOUT_MS` | 单次请求超时毫秒数 | `60000` |

- 配置优先级：命令行 `--url` / `--token` > 真实环境变量 > `.env` 文件 > 默认值。
- `.env` 查找顺序：指定 `--dotenv-file` 时只读取该文件；未指定时依次查当前工作目录 `.env`、skill 目录 `.env`。
- 已存在的环境变量不会被 `.env` 覆盖；把变量显式置空即可临时屏蔽 `.env` 中的同名配置。
- `.env` 已被 `.gitignore` 忽略；`.env.example` 只含占位符。**禁止把真实令牌、bank 名或内网地址写入任何提交文件。**

## 输出与退出码

- 成功：结果输出到 stdout，`--format json`（默认）为完整 JSON，`--format table` 渲染表格或键值对。
- 失败：`{"error":"...","message":"...","hint":"..."}` 输出到 stderr，不打印堆栈。
- 退出码：`0` 成功；`1` 运行时错误（网络、MCP 服务端错误、工具执行失败）；`2` 用法或配置错误（参数不合法、缺少 URL / token）。

## 常见问题

**Q1：提示「缺少 HINDSIGHT_MCP_URL」怎么办？**
A：把 `.env.example` 复制为 `.env`，填入完整端点（形如 `https://example.com/mcp/<bank>`）与令牌；或设置同名环境变量。`--dotenv-file` 可指定其他配置文件。

**Q2：返回 401 / 403？**
A：令牌无效或与端点中的 bank 不匹配。确认 `HINDSIGHT_TOKEN` 对该 bank 有权限；若服务端使用非 Bearer 方案，改用 `HINDSIGHT_AUTH_HEADER` 传完整头值。

**Q3：为什么 `tools` 只有 9 个工具？**
A：服务端暴露 9 个工具；本 skill 不封装同步写入 `sync_retain`，`get_mental_model` 也未暴露。`list-mental-models` 只能列出心智模型；用 `call` 调未暴露的工具会被服务端拒绝。

**Q4：为什么没有 reflect 命令？**
A：`reflect` 需要在服务端跑 LLM 综合大量记忆，当前部署实测单次耗时超过反代 60 秒读超时，CLI 与 MCP 直连均稳定超时（504 / 客户端超时），故不封装。需要综合分析时可改用 `recall` 取原始记忆后自行归纳；服务端调大反代读超时后，可用 `call reflect --args '<JSON>'` 调用。

**Q5：内容很长怎么传？**
A：用 `--content-file <路径>`（`-` 表示从 stdin 读取），避免命令行长度与转义问题。`call` 的长参数可用 `--args-file`。

**Q6：如何调用未封装的工具或传复杂参数？**
A：先 `node skill.js tools` 查看工具与必填参数，再用 `node skill.js call <tool> --args '<JSON>'`。参数必须是 JSON 对象。

详细案例见 `examples/`：

- `examples/memory_basics.md`：写入、浏览、查看单条记忆
- `examples/search.md`：检索过滤与组合条件
- `examples/maintenance_and_raw.md`：修改、作废 / 恢复、心智模型与通用调用
