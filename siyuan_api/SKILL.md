---
name: siyuan-api
description: 当用户要求"查询思源笔记"、"操作思源笔记"、"获取思源笔记内容"、"思源笔记 API"、"写笔记"、"往思源新增/修改笔记"、"同步记忆到思源"时使用此 skill。
version: 260616.170825
---

# 思源笔记 REST API 工具

通过 REST API 与思源笔记交互，支持笔记本、文档、块的**增删改查**、属性、SQL 查询、文件操作、导出，以及从 Memory MCP 同步实体。

---

## 快速开始

```bash
export SIYUAN_URL="http://127.0.0.1:6806"
export SIYUAN_API_TOKEN="your-token"

node skill.js notebook ls                                            # 列笔记本
node skill.js sql "SELECT * FROM blocks WHERE type='d' LIMIT 10"    # SQL 查询
node skill.js doc create --notebook <id> --path note "标题" "# 正文" # 建文档
node skill.js export md <doc-id>                                     # 导出为 Markdown
```

---

## 命令总表

| 对象 | 查询 | 写入 / 修改 |
|------|------|-------------|
| `notebook` | `ls` / `conf <id>` | `create <name>` / `open` / `close` |
| `doc` | `hpath` / `hpath-by-id` / `path-by-id` / `ids-by-hpath` | `create` / `rename` / `remove` |
| `block` | `kramdown <id>` / `children <id>` | `insert` / `prepend` / `append` / `update` / `delete` / `move` |
| `attr` | `get <id>` | `set <id> '<json>'` |
| `sql` | `<stmt>` | — |
| `file` | `get <path>` / `ls <path>` | — |
| `export` | `md <id>` | — |
| `system` | `version` / `time` / `boot` | — |
| `sync` | — | `<notebook-id> '<entity-json>'`（Memory MCP → 思源） |

> 📖 **详细用法、参数说明与完整案例**：
>
> - 📝 创建（建笔记本 / 文档 / 写块）→ [`examples/create.md`](./examples/create.md)
> - 🔍 查询（检索 / SQL / 导出）→ [`examples/query.md`](./examples/query.md)
> - ✏️ 修改（改 / 删 / 移动 / 属性 / 同步）→ [`examples/modify.md`](./examples/modify.md)

---

## 选项

| 选项 | 说明 |
|------|------|
| `--format <type>` | 输出格式（`json` / `yaml` / `table` / `default`）；YAML 省 ~50% token |
| `--notebook <id>` | 笔记本 ID（doc 命令） |
| `--path <path>` | 路径（doc 命令） |
| `--title <t>` | 文档标题（doc create / rename） |
| `--parentID` / `--nextID` / `--previousID` | 块插入 / 移动锚点（大小写不敏感） |

---

## 认证与配置

访问需 API Token：**思源笔记 > 设置 > 关于 > API Token**，通过 `Authorization: Token <token>` 传递。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SIYUAN_URL` | 服务地址 | `http://127.0.0.1:6806` |
| `SIYUAN_API_TOKEN` | API Token | 无 |

也可在同目录 `.env` 写入这两个变量。URL / Token 还可作为命令尾部位置参数临时覆盖。

---

## 命令别名

| 命令 | 别名 |
|------|------|
| `notebook` | `nb` |
| `system` | `sys` |
| `sql` | `query` |
| `doc remove` | `rm` / `delete` |

---

## 常见问题

- **Token 怎么拿？** 设置 > 关于 > API Token。
- **连接被拒？** 确认思源已启动，默认监听 `http://127.0.0.1:6806`。
- **怎么查文档内容？** `export md <id>` 导出 Markdown，或 `block kramdown <id>` 取源码，或 `sql` 直接查 `blocks` 表。
- **怎么写 / 改笔记？** 见 [`examples/create.md`](./examples/create.md) 与 [`examples/modify.md`](./examples/modify.md)。
