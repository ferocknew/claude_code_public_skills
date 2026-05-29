---
name: siyuan-api
description: 当用户要求"查询思源笔记"、"操作思源笔记"、"获取思源笔记内容"、"思源笔记 API"时使用此 skill。
version: 260529.103831
---

# 思源笔记 REST API 工具

通过 REST API 与思源笔记实例交互，支持笔记本、文档、块、属性、SQL 查询、文件操作和导出等功能。

---

## 快速开始

```bash
# 设置环境变量
export SIYUAN_URL="http://127.0.0.1:6806"
export SIYUAN_API_TOKEN="your-api-token"

# 查看系统版本
node skill.js system version

# 列出所有笔记本
node skill.js notebook ls

# SQL 查询
node skill.js sql "SELECT * FROM blocks WHERE type='d' LIMIT 10"

# 导出文档为 Markdown
node skill.js export md 20231230123456-abcdef

# 获取块属性
node skill.js attr get 20231230123456-abcdef
```

---

## 命令参考

| 命令 | 说明 |
|------|------|
| `notebook ls` | 列出所有笔记本 |
| `notebook open <id>` | 打开笔记本 |
| `notebook close <id>` | 关闭笔记本 |
| `notebook conf <id>` | 获取笔记本配置 |
| `doc hpath --notebook <id> --path <path>` | 通过存储路径获取人类可读路径 |
| `doc hpath-by-id <id>` | 通过块 ID 获取人类可读路径 |
| `doc path-by-id <id>` | 通过块 ID 获取存储路径 |
| `doc ids-by-hpath --notebook <id> --path <hpath>` | 通过人类可读路径获取 ID |
| `block kramdown <id>` | 获取块的 Kramdown 内容 |
| `block children <id>` | 获取子块列表 |
| `attr get <id>` | 获取块属性 |
| `sql <stmt>` | 执行 SQL 查询 |
| `file get <path>` | 获取文件内容 |
| `file ls <path>` | 列出目录内容 |
| `export md <id>` | 导出文档为 Markdown |
| `system version` | 获取思源笔记版本 |
| `system time` | 获取服务器时间 |
| `system boot` | 获取启动进度 |

---

## 选项

| 选项 | 说明 |
|------|------|
| `--format <type>` | 输出格式（json/yaml/table/default） |
| `--notebook <id>` | 笔记本 ID（doc 命令） |
| `--path <path>` | 路径（doc 命令） |

---

## 认证

访问 API 需要有效的 API Token。

获取方式：**思源笔记 > 设置 > 关于 > API Token**

Token 通过 `Token` 方式传递：

```
Authorization: Token your-token-here
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SIYUAN_URL` | 思源笔记服务地址 | `http://127.0.0.1:6806` |
| `SIYUAN_API_TOKEN` | API Token | 无 |

也可以在同目录创建 `.env` 文件：

```
SIYUAN_URL=http://127.0.0.1:6806
SIYUAN_API_TOKEN=your-token-here
```

---

## 命令别名

| 命令 | 别名 |
|------|------|
| `notebook` | `nb` |
| `system` | `sys` |
| `sql` | `query` |

---

## 常见问题

**Q: 如何获取 API Token？**
打开思源笔记，进入 **设置 > 关于**，找到 **API Token**。

**Q: 连接被拒绝怎么办？**
确认思源笔记已启动，默认监听 `http://127.0.0.1:6806`。

**Q: SQL 查询支持哪些表？**
常用表：`blocks`（块）、`spans`（行级元素）、`attributes`（属性）、`assets`（资源文件）。

**Q: 如何查看文档内容？**
使用 `export md <id>` 导出为 Markdown，或 `block kramdown <id>` 获取块的 Kramdown 源码。
