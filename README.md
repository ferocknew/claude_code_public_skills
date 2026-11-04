# Claude Code Skills Collection

这是一个 Claude Code 可加载的技能集合，每个目录包含一个用于特定领域的技能包。

## 可用技能

| 技能目录 | 名称 | 描述 |
|---------|------|------|
| `88cha` | 88查企业搜索 | 通过 88cha.com 搜索企业工商信息，支持普通搜索、深度搜索、关联企业与专利 |
| `agent-browser` | Browser Automation | 浏览器自动化，用于网页测试、表单填充、截图和数据提取 |
| `cmo-weather-query` | Weather Query | 中央气象台天气信息查询，支持实时天气、预报与气象预警 |
| `db_client` | Database Client | 数据库客户端，支持 MySQL/PostgreSQL/SQLite 及 SSH 隧道 |
| `dianping-search` | Dianping Search | 大众点评商户搜索，按城市/分类查询评分、评价、人均价格等信息 |
| `drawio_nodejs` | Draw.io Ops | 私有化 draw.io 操作：生成编辑 XML、增删节点、批量建图、导出图片与编辑 URL |
| `doc_reader` | DOCX Reader | 读取 Word 文档（.docx）并转换为 Markdown 或 HTML 格式 |
| `documents_ripgrep` | Document Search | 使用 ripgrep + textract 在代码和 Office 文件中全文搜索 |
| `deepseek-search` | DeepSeek Search | DeepSeek 官方搜索/抓取：带权威性打分的网页搜索与抓取转 Markdown，Key 存 .env |
| `magpie-tools` | Magpie Tools | Magpie 网关 MCP 客户端：网页搜索/抓取（search1api）、SEO 流量查询（goanyapi） |
| `excel-alasql` | Excel with AlaSQL | 使用 SQL 查询处理 Excel 文件（.xlsx、.xls、.csv），支持中文列名 |
| `gaode-map` | 高德地图查询 | 地理编码、POI 搜索（v3+v5）、路径规划、交通态势、地址真实性验证 |
| `figma-code-connect` | Figma Code Connect | 创建/维护 `.figma.ts` 文件，将 Figma 组件映射到代码片段 |
| `figma-create-design-system-rules` | Figma DS Rules | 为 AI 编码助手生成项目级设计系统规则（CLAUDE.md / AGENTS.md） |
| `figma-create-new-file` | Figma Create File | 在用户草稿箱中创建新的空白 Figma 文件 |
| `figma-generate-design` | Figma Generate Design | 从代码或描述在 Figma 中构建/更新完整页面、弹窗、侧边栏等视图 |
| `figma-generate-library` | Figma Generate Library | 从代码库在 Figma 中构建完整设计系统（变量、组件库、主题、文档） |
| `figma-implement-design` | Figma Implement Design | 将 Figma 设计稿转换为生产代码（设计→代码方向） |
| `figma-use` | Figma Plugin API | Figma Plugin API 的 MCP 封装，所有 Figma 写操作的基础技能 |
| `game_mahjong_agent` | Mahjong Game | AI 多人麻将游戏模拟器，支持上海/四川/扬州麻将规则 |
| `happy_agent_easy` | Happy Agent Easy | 简化的 Happy Agent 客户端，用于远程管理 Happy Coder Agent 会话 |
| `hindsight` | Hindsight Memory | Hindsight 长期记忆 MCP 客户端，支持写入、检索、记忆浏览与维护 |
| `jina_reader` | Jina Reader | 使用 Jina AI Reader 获取网页纯文本内容，绕过 JavaScript 渲染 |
| `makepad-进化` | Makepad Evolution | 自我改进的 Makepad 开发技能系统 |
| `obsidian_cli` | Obsidian CLI | 使用 Obsidian CLI 交互：读写笔记、搜索、管理任务、标签与属性 |
| `obsidian-bases` | Obsidian Bases | 创建和编辑 Obsidian Bases (.base) 文件，支持视图、过滤器、公式 |
| `obsidian-json-canvas` | JSON Canvas | 创建和编辑 JSON Canvas (.canvas) 文件，支持节点、边、分组 |
| `sendmail` | Send Mail | 通过 SMTP 发送邮件，支持纯文本/HTML/Markdown、多收件人、附件 |
| `smb-client` | SMB Client | SMB/CIFS 局域网客户端（双引擎：smbclient+纯JS），支持 Windows/NAS 文件管理 |
| `use-http-mcp` | HTTP MCP Tool | 原生 fetch HTTP 工具，支持 REST 请求、Basic/Bearer 鉴权与上传下载 |
| `website_security_scan` | Security Scan | 网站安全扫描与加固：HTTP 安全头、CORS、CSP、XSS 风险检测 |
| `where-am-i` | Where Am I | 查询公网 IP 地址、地理位置、ISP 运营商信息 |
| `where-is-this` | Where Is This | 输入经纬度坐标，逆地理编码为详细地址信息 |
| `x_release_by_agent_browser` | X/Twitter Publish | 通过 agent-browser 自动化在 X/Twitter 上发布推文 |
| `wikijs_api` | Wiki.js API Client | Wiki.js GraphQL API 客户端，支持页面 CRUD、搜索与历史查看 |
| `file_code_box` | FileCodeBox | 文件快递柜 - 匿名口令分享文本和文件，上传后返回提取码和分享链接 |
| `nexus3-skill` | Nexus3 Ops | Nexus3 私服 REST API 操作：查询与删除 docker/npm/pypi/maven 组件 |
| `memos-node` | Memos API Client | 自托管 Memos 客户端：memo 增删改查/归档/置顶/评论/标签与附件管理 |

## 项目规范与约束

### 技能分类与架构
- **Bundled**（含代码）：`run.js` + `build.js` + `package.json` + `lib/`，经 esbuild 打包为 `skill.js`。
- **Agent-only**（纯文档）：仅 `SKILL.md`，由 LLM 驱动外部 CLI 或 MCP 执行。
- **动态 Require 兼容**：若依赖使用动态加载（如 `@marsaud/smb2`），esbuild 打包会生成 `__glob` helper。
  需在 `build.js` 注入扩展名回退补丁（`map[path2] || map[path2 + ".js"]`）以确保运行时正确解析。

### 编码与目录规范
- 目录名短名用下划线（`db_client`），多词用连字符（`agent-browser`）。
- CommonJS（`require`/`module.exports`），Node 18+ 全局 `fetch`，禁用 ESM。
- 错误统一以 JSON 契约输出：`JSON.stringify({ error, message })`。
- 版本号统一为 `YYMMDD.HHmmSS`，由 `build.js` 构建时自动写入并同步 SKILL.md。

### WorkBuddy 技能市场适配规范
- **SKILL.md 必填字段**：`name`, `version`, `display_name`, `display_name_en`, `description`, `description_zh`, `description_en`, `skill_version`。
- **图标规范**：提供 512×512px、不大于 500KB 的 PNG 图标（可配 SVG 矢量源文件）。
- **上传归档**：根目录平铺打包 `icon.png`, `icon.svg`, `skill.js`, `SKILL.md` 为 zip。

### 隐私红线与脱敏
- **绝对禁止将私有信息提交到公开仓库**。
- 不得硬编码内网 IP、真实 token、密码、内部域名，配置必须从环境变量或本地 `.env` 读取。
- 示例与文档中统一采用 RFC 保留占位符（如 `smb.example.com`、`localhost`）。
- 提交前必须执行敏感词、内网网段及密钥前缀扫描。

---

参见 [CLAUDE.md](./CLAUDE.md) 了解开发规范与 Session 历史。
