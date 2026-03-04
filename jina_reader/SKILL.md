---
name: jina-reader
description: 当用户要求"获取网页内容"、"抓取网页"、"读取 Twitter/X 内容"、"获取网页纯文本"、"抓取动态页面"、"绕过 JavaScript 渲染"、"获取社交媒体内容"时，或者需要通过 curl 获取网页的可读文本内容时使用此 skill。
---

# Jina AI Reader 网页内容获取工具

本 skill 使用 Jina AI Reader 服务通过 curl 获取网页内容，特别适合处理 Twitter/X、动态加载页面等复杂网页。

## 概述

Jina AI Reader 是一个免费的网页内容提取服务，能够：
- 将网页转换为纯净的 Markdown 文本
- 绕过 JavaScript 渲染，直接获取页面内容
- 支持 Twitter/X、GitHub、新闻网站等多种平台
- 无需 API Key，直接使用

---

## 快速参考

### 基本用法

```bash
# 获取网页内容（默认 Markdown 格式）
curl "https://r.jina.ai/https://example.com"

# 获取纯文本格式
curl "https://r.jina.ai/https://example.com" -H "X-Return-Format: text"

# 获取 JSON 格式
curl "https://r.jina.ai/https://example.com" -H "X-Return-Format: json"

# 获取 HTML 格式
curl "https://r.jina.ai/https://example.com" -H "X-Return-Format: html"
```

### Twitter/X 支持

```bash
# 获取 Twitter 用户主页
curl "https://r.jina.ai/https://twitter.com/username"

# 获取 Twitter 个人资料
curl "https://r.jina.ai/https://x.com/username"

# 获取单条推文（推文链接）
curl "https://r.jina.ai/https://twitter.com/username/status/1234567890"
```

### 其他平台示例

```bash
# GitHub 仓库/文件
curl "https://r.jina.ai/https://github.com/user/repo"
curl "https://r.jina.ai/https://github.com/user/repo/blob/main/README.md"

# 新闻文章
curl "https://r.jina.ai/https://news.ycombinator.com/item?id=123456"

# 技术文档
curl "https://r.jina.ai/https://docs.python.org/3/library/os.html"

# 博客文章
curl "https://r.jina.ai/https://medium.com/@user/article-title"
```

---

## 返回格式选项

通过 `X-Return-Format` 请求头指定返回格式：

| 格式 | 说明 | 适用场景 |
|------|------|----------|
| `text` | 纯文本格式 | **强烈推荐**：快速浏览、节省 Token（约 1x） |
| `markdown`（默认） | Markdown 格式 | 仅限需要下载保存时使用（约 8-10x） |
| `html` | 原始 HTML | 需要保留 HTML 结构 |
| `json` | JSON 格式 | 程序化处理 |

> ⚠️ **重要提示**：`markdown` 格式的输出量大约是 `text` 格式的 **8-10 倍**！
>
> - **日常使用**：强烈建议使用 `text` 格式，内容足够且节省 Token
> - **需要保存**：仅在需要下载保存网页时使用 `markdown` 格式
> - `text` 格式会移除链接和格式，但核心内容完整保留

### JSON 格式返回结构

```bash
curl "https://r.jina.ai/https://example.com" -H "X-Return-Format: json"
```

返回：
```json
{
  "title": "页面标题",
  "description": "页面描述",
  "url": "原始 URL",
  "content": "Markdown 内容",
  "links": ["相关链接"]
}
```

---

## 高级选项

### 设置超时

```bash
# 使用 curl 的 --max-time 选项
curl --max-time 30 "https://r.jina.ai/https://example.com"
```

### 设置代理

```bash
# 通过代理访问
curl -x "http://proxy:8080" "https://r.jina.ai/https://example.com"
```

### 保存到文件

```bash
# 保存网页内容到文件
curl "https://r.jina.ai/https://example.com" -o output.md

# 保存为纯文本
curl "https://r.jina.ai/https://example.com" -H "X-Return-Format: text" -o output.txt
```

### 跟随重定向

```bash
# 跟随重定向（-L）
curl -L "https://r.jina.ai/https://example.com"
```

---

## 完整示例

### 获取 Twitter 用户信息

```bash
curl "https://r.jina.ai/https://twitter.com/elonmusk" \
  -H "X-Return-Format: text" \
  --max-time 30
```

### 获取 GitHub README

```bash
curl "https://r.jina.ai/https://github.com/anthropics/anthropic-sdk-python" \
  -H "X-Return-Format: markdown"
```

### 获取新闻文章内容

```bash
curl "https://r.jina.ai/https://www.bbc.com/news/technology-12345678" \
  -H "X-Return-Format: text"
```

### 获取技术文档

```bash
curl "https://r.jina.ai/https://docs.anthropic.com/claude/docs" \
  -H "X-Return-Format: markdown"
```

---

## 使用场景

| 场景 | 推荐格式 | 示例 |
|------|----------|-------|
| 读取社交媒体帖子 | `text` ⭐ | Twitter/X 线程内容 |
| 获取技术文档 | `text` ⭐ | API 文档、教程 |
| 抓取新闻文章 | `text` ⭐ | 新闻正文内容 |
| 快速浏览网页 | `text` ⭐ | 任何网页内容 |
| 下载保存网页 | `markdown` | 需要保留链接和格式 |
| 程序化处理 | `json` | 需要结构化数据 |
| 分析 HTML 结构 | `html` | 需要解析 DOM 元素 |

> ⭐ = 推荐格式，节省 Token 且内容完整

---

## 与其他工具对比

| 工具 | 优点 | 缺点 |
|------|------|------|
| **Jina Reader** | 免费、简单、支持动态页面 | 需要网络连接 |
| **curl 直接访问** | 直接获取原始 HTML | 无法处理 JS 渲染 |
| **浏览器自动化** | 完整渲染支持 | 配置复杂、资源消耗大 |

---

## 限制与注意事项

### 限制

- 需要网络连接
- 对于需要登录的页面无法访问
- 某些网站可能屏蔽 Jina 服务
- 内容长度可能被截断

### 注意事项

1. **Twitter/X 限制**：只能获取公开内容，无法获取需登录的内容
2. **速率限制**：免费服务可能有请求频率限制
3. **内容准确性**：动态加载的内容可能不完整
4. **版权问题**：抓取内容请遵守网站的服务条款

---

## 最佳实践

### 快速获取内容（推荐）

```bash
# 默认使用 text 格式，节省 Token
curl -s "https://r.jina.ai/https://example.com" -H "X-Return-Format: text"
```

### 下载保存网页

```bash
# 仅在需要保存时使用 markdown 格式
curl -s "https://r.jina.ai/https://example.com" -o webpage.md
```

### 获取结构化数据

```bash
# JSON 格式便于后续处理
curl -s "https://r.jina.ai/https://example.com" -H "X-Return-Format: json" | jq '.content'
```

### 处理中文内容

```bash
# 确保正确处理 UTF-8
curl "https://r.jina.ai/https://weibo.com/user" -H "X-Return-Format: text" | iconv -f utf-8 -t utf-8
```

---

## 常见问题

### Q: 为什么有些 Twitter 内容无法获取？

A: Jina Reader 只能获取公开内容。如果推文来自私密账户或需要登录才能查看，则无法获取。

### Q: 如何判断是否成功获取内容？

A: 检查 HTTP 状态码和返回内容。成功时返回 200，内容包含页面的主要文本。

### Q: 内容被截断怎么办？

A: 尝试使用 `json` 格式获取完整信息，或检查是否有分页机制。

### Q: 可以在脚本中使用吗？

A: 可以。这是标准的 curl 命令，可以在任何支持 curl 的环境中使用。

---

## 参考资料

- [Jina AI Reader 官网](https://jina.ai/reader/)
- [Jina AI Reader API 文档](https://github.com/jina-ai/reader)
