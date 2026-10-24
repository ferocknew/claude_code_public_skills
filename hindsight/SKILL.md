---
name: hindsight
description: 当用户要求「记住这件事」「保存到长期记忆」「回忆 / 检索之前记录的内容」「反思推理与总结」「列出、查看、修改或作废记忆」「心智模型管理」「文档检索」「标签检索」「知识库操作」时使用此 skill。把 Hindsight MCP 封装为零依赖 CLI：提供记忆读写（retain/recall/reflect）、记忆精细维护、心智模型（list/get）、文档查看（list/get）、标签聚合（list-tags）与知识库管理（kb-tree/kb-search/kb-page/kb-create-folder/kb-create-page/kb-update）。
skill_version: 261024.014746
---

# hindsight

Hindsight 长期记忆与知识沉淀服务的零依赖 CLI：一条命令完成记忆写入、语义检索、深度反思推理、心智模型提取、长文档溯源及知识库管理。命令名与 MCP 工具完全对应（且知识库支持 `kb-*` 便捷短别名），适合脚本化调用，也适合 LLM 直接执行。

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

# 3) 写入一条记忆（写操作）与检索、反思
node skill.js retain "用户偏好：回答使用简体中文" --tags preference,language
node skill.js recall "用户语言偏好" --max-tokens 2048
node skill.js reflect "用户在系统架构上有哪些偏好" --budget mid

# 4) 浏览与查看
node skill.js list-memories --limit 20 --format table
node skill.js get-memory <memory_id>

# 5) 维护：修改 / 软作废 / 恢复（均为写操作）
node skill.js update-memory <memory_id> --text "修正后的内容"
node skill.js invalidate-memory <memory_id> --reason "内容已过时"
node skill.js invalidate-memory <memory_id> --restore

# 6) 心智模型、标签与文档溯源
node skill.js list-mental-models --limit 10
node skill.js get-mental-model <mental_model_id>
node skill.js list-tags --limit 30 --format table
node skill.js list-documents --limit 10
node skill.js get-document <document_id>

# 7) 知识库管理（支持 kb-* 短别名）
node skill.js kb-tree
node skill.js kb-search "网络部署架构"
node skill.js kb-page <page_id>
node skill.js kb-create-folder "服务部署规范"
node skill.js kb-create-page "NAS服务架构" "总结 40 NAS 上运行的所有 Docker 服务与端口"
node skill.js kb-update <node_id> --name "新页面标题"
```

> `retain` / `update-memory` / `invalidate-memory` / `kb-create-*` / `kb-update` 会修改真实的长期记忆与知识资产，执行前确认目标参数。`invalidate-memory` 为软作废，可用 `--restore` 恢复。

## 命令总表（已对齐当前 18 个 MCP 工具）

| 分类 | 命令 | 对应 MCP 工具 | 写操作 | 常用选项 |
|---|---|---|---|---|
| **核心与记忆** | `retain <内容>` | `retain` | 是 | `--context` `--tags` `--metadata` `--document-id` `--strategy` `--update-mode` `--content-file` |
| | `recall <查询词>` | `recall` | 否 | `--max-tokens` `--budget` `--types` `--tags` `--tags-match` `--prefer-observations` |
| | `reflect <查询词>` | `reflect` | 否 | `--context` `--budget` `--max-tokens` `--tags` `--tags-match` `--include-based-on` `--include-trace` |
| | `list-memories` | `list_memories` | 否 | `--type` `-q/--query` `--limit` `--offset` `--tags` `--tags-match` |
| | `get-memory <id>` | `get_memory` | 否 | 无 |
| | `update-memory <id>` | `update_memory` | 是 | `--text` `--context` `--occurred-start` `--occurred-end` `--fact-type` `--entities` `--no-resolve-entities` |
| | `invalidate-memory <id>` | `invalidate_memory` | 是 | `--reason` `--restore` |
| **心智模型** | `list-mental-models` | `list_mental_models` | 否 | `--tags` `--limit` `--offset` |
| | `get-mental-model <id>` | `get_mental_model` | 否 | `--detail` |
| **文档管理** | `list-documents` | `list_documents` | 否 | `-q/--query` `--limit` `--offset` |
| | `get-document <id>` | `get_document` | 否 | 无 |
| **标签聚合** | `list-tags` | `list_tags` | 否 | `-q/--query` `--limit` `--offset` |
| **知识库** | `kb-tree` | `get_knowledge_base_tree` | 否 | 无 |
| | `kb-search <查询词>` | `search_knowledge_base` | 否 | `--limit` |
| | `kb-page <page_id>` | `get_knowledge_page` | 否 | 无 |
| | `kb-create-folder <名称>` | `create_knowledge_folder` | 是 | `--parent-id` |
| | `kb-create-page <名称> <词>` | `create_knowledge_page` | 是 | `--parent-id` `--tags` `--max-tokens` |
| | `kb-update <node_id>` | `update_knowledge_node` | 是 | `--name` `--parent-id` `--source-query` `--tags` `--max-tokens` |
| **系统底层** | `tools` | 工具列举 | 否 | 无 |
| | `call <tool>` | 通用底层调用 | 视工具 | `--args <JSON>` / `--args-file <路径>` |

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

**Q3：服务端支持多少个工具？**
A：服务端当前暴露并启用了 18 个工具，覆盖记忆读写、心智模型、文档追溯、标签索引和知识库，本 skill 已提供一等公民命令支持。

**Q4：reflect 命令怎么用？**
A：`reflect` 适合对知识库或记忆进行复杂主题的反思与总结。建议配合 `--budget low` 或 `--budget mid` 使用，可以指定 `--context` 以及 `--include-based-on` 查看推理所依赖的记忆来源。

**Q5：内容很长怎么传？**
A：用 `--content-file <路径>`（`-` 表示从 stdin 读取），避免命令行长度与转义问题。`call` 的长参数可用 `--args-file`。

**Q6：如何调用未封装的工具或传复杂参数？**
A：先 `node skill.js tools` 查看工具与必填参数，再用 `node skill.js call <tool> --args '<JSON>'`。参数必须是 JSON 对象。

详细案例见 `examples/`：

- `examples/memory_basics.md`：写入、浏览、查看单条记忆
- `examples/search.md`：检索过滤与组合条件
- `examples/maintenance_and_raw.md`：修改、作废 / 恢复、心智模型与通用调用
