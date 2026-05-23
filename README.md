# Claude Code Skills Collection

这是一个 Claude Code 可加载的技能集合，每个目录包含一个用于特定领域的技能包。

## 可用技能

| 技能目录 | 名称 | 描述 |
|---------|------|------|
| `88cha` | 88查企业搜索 | 通过 88cha.com 搜索企业工商信息，支持普通搜索和深度搜索，返回企业名称、法人、注册资本、经营范围等 |
| `agent-browser` | Browser Automation | 浏览器自动化，用于网页测试、表单填充、截图和数据提取 |
| `cmo-weather-query` | Weather Query | 中央气象台天气信息查询，支持实时天气、天气预报、气象预警 |
| `db_client` | Database Client | 数据库客户端，支持 MySQL、PostgreSQL、SQLite，以及 SSH 隧道连接远程数据库 |
| `dianping-search` | Dianping Search | 大众点评商户搜索，按城市/分类查询评分、评价、人均价格等信息 |
| `doc_reader` | DOCX Reader | 读取 Microsoft Word 文档（.docx）并转换为 Markdown 或 HTML 格式 |
| `documents_ripgrep` | Document Search | 使用 ripgrep + textract 在代码和 Office 文件中全文搜索 |
| `excel-alasql` | Excel with AlaSQL | 使用 SQL 查询处理 Excel 文件（.xlsx、.xls、.csv），支持中文文件名和列名 |
| `gaode-map` | 高德地图查询 | 地理编码、POI搜索（v3+v5）、路径规划、交通态势、地址真实性验证，零运行时依赖 |
| `figma-code-connect` | Figma Code Connect | 创建/维护 `.figma.ts` 文件，将 Figma 组件映射到代码片段 |
| `figma-create-design-system-rules` | Figma DS Rules | 为 AI 编码助手生成项目级设计系统规则（CLAUDE.md / AGENTS.md） |
| `figma-create-new-file` | Figma Create File | 在用户草稿箱中创建新的空白 Figma 文件 |
| `figma-generate-design` | Figma Generate Design | 从代码或描述在 Figma 中构建/更新完整页面、弹窗、侧边栏等视图 |
| `figma-generate-library` | Figma Generate Library | 从代码库在 Figma 中构建完整设计系统（变量、组件库、主题、文档） |
| `figma-implement-design` | Figma Implement Design | 将 Figma 设计稿转换为生产代码（设计→代码方向） |
| `figma-use` | Figma Plugin API | Figma Plugin API 的 MCP 封装，所有 Figma 写操作的基础技能 |
| `game_mahjong_agent` | Mahjong Game | AI 多人麻将游戏模拟器，支持上海/四川/扬州麻将规则 |
| `happy_agent_easy` | Happy Agent Easy | 简化的 Happy Agent 客户端，用于远程管理 Happy Coder Agent 会话，优化输出格式以减少 token 消耗 |
| `jina_reader` | Jina Reader | 使用 Jina AI Reader 获取网页纯文本内容，绕过 JavaScript 渲染 |
| `makepad-进化` | Makepad Evolution | 自我改进的 Makepad 开发技能系统 |
| `obsidian_cli` | Obsidian CLI | 使用 Obsidian CLI 与本地知识库交互 - 读取笔记、搜索、创建笔记、管理任务、标签、属性 |
| `obsidian-bases` | Obsidian Bases | 创建和编辑 Obsidian Bases (.base) 文件，支持视图、过滤器、公式 |
| `obsidian-json-canvas` | JSON Canvas | 创建和编辑 JSON Canvas (.canvas) 文件，支持节点、边、分组 |
| `sendmail` | Send Mail | 通过 SMTP 发送邮件，支持纯文本/HTML/Markdown、多收件人、附件 |
| `use-http-mcp` | HTTP MCP Tool | HTTP 请求工具，使用 Node.js 原生 fetch API，支持 GET/POST/PUT/DELETE/PATCH、Basic Auth、Bearer Token、文件上传下载 |
| `website_security_scan` | Security Scan | 网站安全扫描与加固：HTTP 安全头、CORS、CSP、XSS 风险检测 |
| `where-am-i` | Where Am I | 查询公网 IP 地址、地理位置、ISP 运营商信息 |
| `where-is-this` | Where Is This | 输入经纬度坐标，逆地理编码为详细地址信息 |
| `x_release_by_agent_browser` | X/Twitter Publish | 通过 agent-browser 自动化在 X/Twitter 上发布推文 |
| `wikijs_api` | Wiki.js API Client | Wiki.js GraphQL API 客户端，支持页面 CRUD、搜索、历史查看，支持 YAML 输出节省 Token |

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
