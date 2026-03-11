# Claude Code Skills Collection

这是一个 Claude Code 可加载的技能集合，每个目录包含一个用于特定领域的技能包。

## 可用技能

| 技能目录 | 名称 | 描述 |
|---------|------|------|
| `agent-browser` | Browser Automation | 浏览器自动化，用于网页测试、表单填充、截图和数据提取 |
| `db_client` | Database Client | 数据库客户端，支持 MySQL、PostgreSQL、SQLite，以及 SSH 隧道连接远程数据库 |
| `doc_reader` | DOCX Reader | 读取 Microsoft Word 文档（.docx）并转换为 Markdown 或 HTML 格式 |
| `excel-alasql` | Excel with AlaSQL | 使用 SQL 查询处理 Excel 文件（.xlsx、.xls、.csv），支持中文文件名和列名 |
| `makepad-进化` | Makepad Evolution | 自我改进的 Makepad 开发技能系统 |
| `obsidian_cli` | Obsidian CLI | 使用 Obsidian CLI 与本地知识库交互 - 读取笔记、搜索、创建笔记、管理任务、标签、属性 |
| `obsidian-bases` | Obsidian Bases | 创建和编辑 Obsidian Bases (.base) 文件，支持视图、过滤器、公式 |
| `obsidian-json-canvas` | JSON Canvas | 创建和编辑 JSON Canvas (.canvas) 文件，支持节点、边、分组 |
| `happy_agent_easy` | Happy Agent Easy | 简化的 Happy Agent 客户端，用于远程管理 Happy Coder Agent 会话，优化输出格式以减少 token 消耗 |
| `use-http-mcp` | HTTP MCP Tool | HTTP 请求工具，使用 Node.js 原生 fetch API，支持 GET/POST/PUT/DELETE/PATCH、Basic Auth、Bearer Token、文件上传下载 |

## 技能文件结构

每个技能目录包含 `SKILL.md` 文件，格式如下：

```yaml
---
name: skill-name
description: Brief description of when to use this skill.
---

# 技能文档

详细内容...
```

---

参见 [CLAUDE.md](./CLAUDE.md) 了解更多项目信息。
