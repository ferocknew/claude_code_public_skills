# 查询案例 — 思源笔记 API

只读检索笔记本、文档、块、属性。所有命令需先配置 `SIYUAN_URL` 与 `SIYUAN_API_TOKEN`（见 SKILL.md）。

---

## 笔记本

```bash
node skill.js notebook ls            # 列出所有笔记本（含 ID、开关状态）
node skill.js notebook conf <id>     # 笔记本配置
```

---

## 文档路径互查

```bash
# 存储路径 → 人类可读路径
node skill.js doc hpath --notebook <id> --path diary/2026-06-16

# 块 ID → 人类可读路径 / 存储路径
node skill.js doc hpath-by-id <block-id>
node skill.js doc path-by-id <block-id>

# 人类可读路径 → 文档 ID
node skill.js doc ids-by-hpath --notebook <id> --path /diary/2026-06-16
```

---

## 块内容

```bash
node skill.js block kramdown <block-id>    # 块的 Kramdown 源码
node skill.js block children <parent-id>   # 子块列表（类型、ID、预览）
```

---

## SQL 查询（最灵活）

直接查 SQLite，常用表：`blocks`（块）、`spans`（行级）、`attributes`（属性）、`assets`（资源）。

```bash
# 所有文档块
node skill.js sql "SELECT id, hpath FROM blocks WHERE type='d' LIMIT 20"

# 指定笔记本下的文档
node skill.js sql "SELECT id, content FROM blocks WHERE box='<notebook-id>' AND type='d'"

# 全文模糊搜索
node skill.js sql "SELECT id, type, content FROM blocks WHERE content LIKE '%关键词%' LIMIT 20"

# 某块的属性
node skill.js sql "SELECT * FROM attributes WHERE id='<block-id>'"
```

> 💡 `type` 取值：`d` 文档、`h` 标题、`p` 段落、`l` 列表、`c` 代码块、`m` 引用块等。

---

## 属性 / 文件 / 导出 / 系统

```bash
node skill.js attr get <block-id>        # 块属性
node skill.js file ls /data/2026         # 列出笔记本下目录
node skill.js file get <path>            # 读取文件内容
node skill.js export md <doc-id>         # 导出文档为 Markdown
node skill.js system version             # 思源版本
node skill.js system time                # 服务器时间
node skill.js system boot                # 启动进度
```

---

## 输出格式

多数命令支持 `--format json|yaml|table|default`。YAML 比 JSON 省约 50% token，适合给 LLM 分析。

```bash
node skill.js block children <id> --format yaml
node skill.js notebook ls --format json
```

---

## 相关

- 新增内容：见 [`create.md`](./create.md)
- 修改 / 删除：见 [`modify.md`](./modify.md)
