# 修改案例 — 思源笔记 API

改写或删除已有文档、块、属性，以及从 Memory MCP 同步实体。所有命令需先配置 `SIYUAN_URL` 与 `SIYUAN_API_TOKEN`（见 SKILL.md）。

> ⚠️ 删除类操作（`doc remove` / `block delete`）**不可逆，不推荐日常使用**。确需删除时，务必先用 `sql` 核对 ID 并备份内容；本文件不提供删除示例，以防误操作。

---

## 文档改名

```bash
node skill.js doc rename <doc-id> --title "新标题"
```

---

## 块更新 / 移动

```bash
# 更新块内容（整体替换为新的 Markdown）
node skill.js block update <block-id> "替换后的新内容"

# 移动块：到某块之后，或成为某父块的子块
node skill.js block move <block-id> --previousID <target-id>
node skill.js block move <block-id> --parentID <target-id>
```

---

## 设置块属性（`attr set`）

属性以 JSON 传入，key 通常带 `custom-` 前缀。

```bash
# 位置参数
node skill.js attr set <block-id> '{"custom-tag":"重要","custom-status":"done"}'

# 或用 --attrs
node skill.js attr set <block-id> --attrs '{"custom-tag":"重要"}'
```

读取用 `attr get`（见 [`query.md`](./query.md)）。

---

## 从 Memory MCP 同步实体（`sync`）

把 Memory MCP 的实体（名称 / 类型 / 观察）落成思源笔记：实体为父文档，每条观察为子文档，通过双链互相关联。重复同步会按 `uuid` 或路径**更新**而非重复创建。

```bash
node skill.js sync <notebook-id> '{
  "name": "SiYuan API",
  "entityType": "Tool",
  "uuid": "mem-uuid-可选",
  "observations": [
    "支持通过 Markdown 创建文档",
    {"content": "block 命令可增删改", "uuid": "obs-uuid-可选"}
  ],
  "tags": ["api","note"],
  "relations": [{"relationType": "alternative to", "toEntity": "Obsidian"}]
}'
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 实体名称（文档标题） |
| `entityType` | 是 | 实体类型 |
| `uuid` | 否 | Memory MCP UUID，用于幂等更新 / 定位 |
| `observations` | 否 | 字符串数组，或 `{content, uuid}` 对象数组 |
| `tags` / `relations` / `createdAt` | 否 | 标签 / 关联 / 日期 |

---

## 相关

- 新增笔记本 / 文档：见 [`create.md`](./create.md)
- 查询定位 ID：见 [`query.md`](./query.md)
