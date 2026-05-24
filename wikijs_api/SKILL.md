---
name: wikijs-api
description: 当用户要求"查询 Wiki.js"、"操作 Wiki.js"、"获取 Wiki.js 页面"、"创建 Wiki.js 页面"、"Wiki.js GraphQL API"时，或者需要通过 GraphQL API 与 Wiki.js 实例交互时使用此 skill。
version: 260524.094519
---

# Wiki.js GraphQL API 工具

通过 GraphQL API 与 Wiki.js 实例交互，支持页面查询、创建、更新，以及用户、资产和评论管理。

> ⚠️ **安全警告：本技能绝对不允许通过 API 删除页面或评论。删除操作必须由人工在 Wiki.js 管理后台进行，以防误删造成数据丢失。**

---

## 快速开始

```bash
# 设置环境变量（可选）
export WIKI_URL="https://wiki.example.com"
export WIKI_TOKEN="your-api-token"

# 查询所有页面
node skill.js query pages

# 查询目录树（默认 yaml 格式）
node skill.js query tree --path "some/directory"
node skill.js query tree --path "some/directory" --mode PAGES
node skill.js query tree --path "some/directory" --mode FOLDERS --locale zh
node skill.js query tree --path "some/directory" --format json

# 创建页面
node skill.js create "new/page" "标题" "内容"

# 更新页面
node skill.js update 15 "新内容"

# 搜索页面
node skill.js search "关键词"

# 查询评论（默认 YAML 格式）
node skill.js comments list "test/history" "zh"

# 创建评论
node skill.js comments create 78 "评论内容"
```

---

## 命令参考

| 命令 | 说明 |
|------|------|
| `query <resource>` | 查询资源（pages, page, tree, users, groups, assets） |
| `create <path> <title> <content>` | 创建页面 |
| `update <page-id> <content>` | 更新页面 |
| `search <query>` | 搜索页面（默认带预览摘要） |
| `comments list <path> <locale>` | 查询评论列表 |
| `comments single <comment-id>` | 查询单条评论 |
| `comments create <page-id> <content>` | 创建评论 |
| `comments update <comment-id> <content>` | 更新评论 |

---

## 常用选项

| 选项 | 说明 |
|------|------|
| `--format <type>` | 输出格式（json/yaml/table/默认） |
| `--fields <list>` | 指定返回字段（逗号分隔） |
| `--orderBy <field>` | 排序字段（查询页面） |
| `--limit <number>` | 限制结果数量 |
| `--path <path>` | 页面路径（创建/更新/搜索/目录树） |
| `--title <title>` | 页面标题（更新） |
| `--locale <locale>` | 语言（目录树） |
| `--mode <mode>` | 目录树模式：FOLDERS/PAGES/ALL（默认 ALL） |
| `--isPrivate <bool>` | 是否私有（创建页面，默认 false） |
| `--isPublished <bool>` | 是否发布（创建页面，默认 true） |
| `--replyTo <id>` | 回复评论 ID |
| `--guestName <name>` | 访客名称 |
| `--guestEmail <email>` | 访客邮箱 |

---

## 认证

访问 API 需要有效的 API Token，从 **管理后台 > API Access** 生成。

Token 通过 Bearer 方式传递：

```
Authorization: Bearer eyJhbGc...aXczt18H6437W
```

---

## 错误代码

| 代码范围 | 类别 |
|---------|------|
| 1001-1020 | 认证/用户错误 |
| 2001-2009 | 资产错误 |
| 3001-3004 | 邮件错误 |
| 4001-4002 | 搜索错误 |
| 5001-5002 | 本地化错误 |
| 6001-6013 | 页面/渲染错误 |
| 7001-7004 | 系统错误 |
| 8001-8006 | 评论错误 |

---

## 支持类型

| 内容类型 | 编辑器 |
|---------|--------|
| markdown | markdown |
| html | ckeditor |
| json | api |
| - | code |

---

## GraphQL Playground

访问 `https://your-wiki.com/graphql` 打开 Playground 测试查询。

HTTP Headers:
```json
{ "Authorization": "Bearer YOUR_TOKEN" }
```

---

## 更多示例

- [GraphQL 查询示例](./examples/graphql.md)
- [脚本示例](./examples/scripts.md)

---

## 常见问题

**Q: 如何获取 API Token？**
登录 Wiki.js 管理后台，导航到 **API Access**，点击 **+ New Token**。

**Q: 权限不足怎么办？**
检查 API Token 的权限范围，确保包含所需权限（如 `pages:read`, `pages:write`）。

**Q: 如何调试 GraphQL 查询？**
使用 GraphQL Playground (`/graphql`) 测试查询。

**Q: 评论路径不包含语言前缀？**
是的，评论 API 使用 `path`（如 `test/history`）和 `locale`（如 `zh`）参数，不包含 `/zh` 前缀。

**Q: 如何创建私有页面？**
使用 `--isPrivate true`，如：`node skill.js create "private/page" "标题" "内容" --isPrivate true`。