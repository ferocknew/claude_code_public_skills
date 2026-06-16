# 创建案例 — 思源笔记 API

新增笔记本、文档、块内容。所有命令需先配置 `SIYUAN_URL` 与 `SIYUAN_API_TOKEN`（见 SKILL.md）。

---

## 1. 创建笔记本

```bash
node skill.js notebook create "我的笔记本"
# ✅ 笔记本已创建
#    ID: 20260616120000-abcdefgh
```

创建后用 `notebook ls` 查看 ID。

---

## 2. 创建文档（`doc create`）

用 Markdown 创建一篇文档，返回文档 ID。

```bash
node skill.js doc create \
  --notebook 20260616120000-abcdefgh \
  --path diary/2026-06-16 \
  --title "今日笔记" \
  "# 今日笔记

- 完成文档拆分
- 修复参数 bug"
```

参数说明：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--notebook <id>` | 是 | 目标笔记本 ID |
| `--path <path>` | 是 | 文档路径，无需 `/` 开头（代码会自动补） |
| `--title <t>` | 否 | 文档标题 |
| `<markdown>` | 否 | 文档正文（不传则建空文档） |

> 💡 路径 `diary/2026-06-16` 会创建为「我的笔记本 / diary / 2026-06-16」。

---

## 3. 往文档写入块（`block insert` / `prepend` / `append`）

先拿到文档块 ID（文档本身就是根块），可用 `doc ids-by-hpath` 或 `sql` 查到。

```bash
# 在文档末尾追加一个段落
node skill.js block append "新段落内容" --parentID <文档块ID>

# 在文档开头插入
node skill.js block prepend "标题文本" --parentID <文档块ID>

# 精确插入到某块之后 / 之前
node skill.js block insert "内容" --previousID <某块ID>
node skill.js block insert "内容" --nextID <某块ID>
```

| 子命令 | 锚点 | 说明 |
|--------|------|------|
| `append` | `--parentID` | 追加到父块末尾 |
| `prepend` | `--parentID` | 插到父块开头 |
| `insert` | `--parentID` / `--nextID` / `--previousID` 三选一 | 任意位置插入 |

> 内容用 Markdown 语法，`dataType` 固定为 `markdown`。锚点参数大小写不敏感（`--parentID` 与 `--parentid` 均可）。

---

## 4. 典型流程：从零建一篇带内容的笔记

```bash
# ① 建笔记本（已有可跳过）
node skill.js notebook create "知识库"

# ② 列出拿到笔记本 ID
node skill.js notebook ls

# ③ 建文档（返回值会打印文档 ID）
node skill.js doc create --notebook <nb-id> --path tech/siyuan "SiYuan" "# SiYuan

正文..."

# ④ 后续追加内容（用第 ③ 步返回的文档 ID 作为 parentID）
node skill.js block append "## 补充

更多内容" --parentID <doc-id>
```

---

## 相关

- 查询已有笔记本 / 文档：见 [`query.md`](./query.md)
- 修改 / 删除已有内容：见 [`modify.md`](./modify.md)
