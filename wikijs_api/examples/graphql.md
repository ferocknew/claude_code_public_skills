# GraphQL 查询示例

Wiki.js GraphQL API 原始查询参考。

## 查询 (Query)

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

### 查询评论列表

```graphql
{
  comments {
    list (path: "test/history", locale: "zh") {
      id
      content
      authorName
      createdAt
    }
  }
}
```

### 查询单条评论

```graphql
{
  comments {
    single (id: 1) {
      id
      content
      render
      authorName
      authorId
      createdAt
    }
  }
}
```

---

## 变更 (Mutation)

### 创建页面

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

### 更新页面

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

### 创建评论

```graphql
mutation {
  comments {
    create (
      pageId: 78
      content: "这是一条评论"
      replyTo: 0
    ) {
      responseResult {
        succeeded
        message
        errorCode
      }
    }
  }
}
```

### 更新评论

```graphql
mutation {
  comments {
    update (
      id: 1
      content: "更新后的评论内容"
    ) {
      responseResult {
        succeeded
        message
        errorCode
      }
    }
  }
}
```