---
name: wikijs-api
description: 当用户要求"查询 Wiki.js"、"操作 Wiki.js"、"获取 Wiki.js 页面"、"创建 Wiki.js 页面"、"Wiki.js GraphQL API"时，或者需要通过 GraphQL API 与 Wiki.js 实例交互时使用此 skill。
version: 260523.115201
---

# Wiki.js GraphQL API 工具

本 skill 提供通过 GraphQL API 与 Wiki.js 实例交互的完整功能，包括页面查询、创建、更新、删除，以及用户和资产管理。

## 概述

Wiki.js 提供完整的 GraphQL API，可用于访问和修改 Wiki 中的所有资源。本工具简化了 GraphQL 查询的构建和执行过程。

## 运行方式

**直接运行，无需安装依赖：**

```bash
# 查询所有页面
node skill.js query <base-url> <token> pages

# 查询单个页面
node skill.js query <base-url> <token> page <page-id>

# 创建页面
node skill.js create <base-url> <token> <path> <title> <content>

# 更新页面
node skill.js update <base-url> <token> <page-id> <content>

# 删除页面
node skill.js delete <base-url> <token> <page-id>

# 搜索页面
node skill.js search <base-url> <token> <query>

# 查询用户
node skill.js query <base-url> <token> users
```

**参数说明：**
- `base-url`: Wiki.js 实例的基础 URL（如 `https://wiki.example.com`）
- `token`: API 访问令牌（从管理后台的 API Access 生成）
- `path`: 页面路径（如 `docs/getting-started`）

---

## 认证

访问 API 需要有效的 API Token，从 **管理后台 > API Access** 生成。

Token 必须作为 Bearer token 传递：

```
Authorization: Bearer eyJhbGc...aXczt18H6437W
```

**权限范围：** 不同操作需要不同的权限，确保 API Token 包含所需的权限范围。

---

## 操作模式

### 1. 查询页面

```bash
# 列出所有页面
node skill.js query https://wiki.example.com <token> pages

# 按标题排序
node skill.js query https://wiki.example.com <token> pages --orderBy TITLE

# 限制返回数量
node skill.js query https://wiki.example.com <token> pages --limit 10

# 查询单个页面
node skill.js query https://wiki.example.com <token> page 15
```

**返回字段：** id, path, title, description, contentType, locale, createdAt, updatedAt

### 2. 创建页面

```bash
# 基本创建
node skill.js create https://wiki.example.com <token> "new/page" "新页面" "内容"

# 指定内容类型
node skill.js create https://wiki.example.com <token> "new/page" "新页面" "内容" --contentType markdown

# 指定编辑器
node skill.js create https://wiki.example.com <token> "new/page" "新页面" "内容" --editor markdown

# 指定父页面
node skill.js create https://wiki.example.com <token> "parent/new" "新页面" "内容" --parentId 5
```

### 3. 更新页面

```bash
# 更新内容
node skill.js update https://wiki.example.com <token> 15 "新内容"

# 更新标题和内容
node skill.js update https://wiki.example.com <token> 15 "新内容" --title "新标题"

# 更新路径
node skill.js update https://wiki.example.com <token> 15 "新内容" --path "new/path"
```

### 4. 删除页面

```bash
node skill.js delete https://wiki.example.com <token> 15
```

### 5. 搜索页面

```bash
node skill.js search https://wiki.example.com <token> "关键词"

# 指定搜索路径
node skill.js search https://wiki.example.com <token> "关键词" --path "docs"

# 限制结果
node skill.js search https://wiki.example.com <token> "关键词" --limit 20
```

### 6. 查询用户

```bash
# 列出所有用户
node skill.js query https://wiki.example.com <token> users

# 搜索用户
node skill.js query https://wiki.example.com <token> users --search "john"
```

### 7. 查询用户组

```bash
node skill.js query https://wiki.example.com <token> groups
```

### 8. 查询资产

```bash
# 列出所有资产
node skill.js query https://wiki.example.com <token> assets

# 列出特定文件夹
node skill.js query https://wiki.example.com <token> assets --folderId 1
```

---

## GraphQL 查询示例

### 获取所有页面

```graphql
{
  pages {
    list (orderBy: TITLE) {
      id
      path
      title
      description
      contentType
      locale
      createdAt
      updatedAt
    }
  }
}
```

### 获取单个页面

```graphql
{
  pages {
    single (id: 15) {
      id
      path
      title
      content
      contentType
      createdAt
      updatedAt
    }
  }
}
```

### 创建页面（Mutation）

```graphql
mutation {
  pages {
    create (
      path: "new/page"
      title: "新页面"
      content: "页面内容"
      contentType: markdown
      editor: markdown
      description: "页面描述"
      isPublished: true
      locale: zh
    ) {
      responseResult {
        succeeded
        slug
        message
        errorCode
      }
      page {
        id
        path
        title
      }
    }
  }
}
```

### 更新页面（Mutation）

```graphql
mutation {
  pages {
    update (
      id: 15
      content: "新内容"
      title: "新标题"
    ) {
      responseResult {
        succeeded
        slug
        message
        errorCode
      }
      page {
        id
        path
        title
        updatedAt
      }
    }
  }
}
```

### 删除页面（Mutation）

```graphql
mutation {
  pages {
    delete (
      id: 15
    ) {
      responseResult {
        succeeded
        slug
        message
        errorCode
      }
    }
  }
}
```

### 搜索页面

```graphql
{
  pageSearch {
    query (query: "关键词") {
      results {
        id
        title
        path
        description
      }
      totalHits
    }
  }
}
```

---

## 错误处理

所有 Mutation 操作返回 `responseResult`：

```graphql
type ResponseStatus {
  succeeded: Boolean!
  errorCode: Int!
  slug: String!
  message: String
}
```

### 错误代码参考

| 代码 | Slug | 类别 |
|------|------|------|
| 1001-1020 | Auth* | 认证/用户错误 |
| 2001-2009 | Asset* | 资产错误 |
| 3001-3004 | Mail* | 邮件错误 |
| 4001-4002 | Search* | 搜索错误 |
| 5001-5002 | Locale* | 本地化错误 |
| 6001-6013 | Page* | 页面/渲染错误 |
| 7001-7004 | System* | 系统错误 |
| 8001-8006 | Comment* | 评论错误 |

---

## 支持的内容类型

- `markdown` - Markdown 格式
- `html` - HTML 格式
- `json` - JSON 格式

---

## 支持的编辑器

- `markdown` - Markdown 编辑器
- `ckeditor` - CKEditor 富文本编辑器
- `api` - API 编辑器
- `code` - 代码编辑器

---

## GraphQL Playground

访问 `https://your-wiki.com/graphql` 可以打开 GraphQL Playground，用于测试查询和探索所有可用的资源。

在 GraphQL Playground 的 HTTP Headers 面板中添加：

```json
{
  "Authorization": "Bearer YOUR_TOKEN"
}
```

---

## 限制与注意事项

### 限制

- API Token 需要适当的权限范围
- 某些操作可能需要管理员权限
- 大量查询可能触发速率限制

### 注意事项

1. **路径冲突**：创建页面时，目标路径不能已存在
2. **内容验证**：页面内容不能为空
3. **权限验证**：确保 Token 具有所需权限
4. **版本要求**：API Access 功能需要 Wiki.js 2.2+

---

## 完整示例

### 创建文档页面

```bash
node skill.js create \
  https://wiki.example.com \
  YOUR_TOKEN \
  "docs/api-reference" \
  "API 参考" \
  "# API 参考文档\n\n这是一份 API 参考文档。"
```

### 批量更新页面

```bash
# 创建脚本批量更新
for id in 10 11 12; do
  node skill.js update \
    https://wiki.example.com \
    YOUR_TOKEN \
    $id \
    "更新后的内容"
done
```

### 搜索并导出

```bash
# 搜索结果导出到 JSON
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词" --format json > results.json
```

---

## 环境变量

支持通过环境变量设置默认值：

```bash
# 设置默认 URL
export WIKI_URL="https://wiki.example.com"

# 设置默认 Token
export WIKI_TOKEN="your-api-token"

# 简化命令
node skill.js query pages
node skill.js create "new/page" "标题" "内容"
```

---

## 常见问题

### Q: 如何获取 API Token？

A: 登录 Wiki.js 管理后台，导航到 **API Access**，点击 **+ New Token**，设置名称和权限范围，复制生成的 Token。

### Q: 权限不足怎么办？

A: 检查 API Token 的权限范围，确保包含所需的权限（如 `pages:read`, `pages:write`）。

### Q: 如何调试 GraphQL 查询？

A: 使用 GraphQL Playground (`/graphql`) 测试查询，查看完整的错误信息和建议。

### Q: 支持批量操作吗？

A: 目前需要通过脚本循环实现批量操作，或构建包含多个操作的 GraphQL 查询。