# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库概览

**Claude Code Skills Collection**：Claude Code 可加载的技能集合，每个目录一个技能包。

技能分两类（另有 3 个结构例外）：
- **Bundled**：`run.js` + `build.js` + `package.json`，esbuild 打包为 `skill.js`。
- **Agent-only**：仅 `SKILL.md`，由 LLM 通过 MCP 工具或外部 CLI 驱动。
- **例外**：`kavita-lite` 手写 ESM；`ocr_tool` 直跑 `run.js`；`magpie-image-gen` 为脚本型。

## 常用命令

每个 Bundled 技能独立构建，仓库无根 package.json、workspace 或批量构建脚本：

```bash
cd <skill-dir>
pnpm install && pnpm run build   # 等价于 node build.js，产物为 skill.js
node skill.js --help             # 冒烟验证
head -2 skill.js                 # 查看首行 banner 版本号
```

- 必须在技能目录内构建：`build.js` 入口与输出均为相对路径，从根目录执行会导致路径错位。
- 零依赖验证：`tmp=$(mktemp -d) && cp <dir>/skill.js "$tmp"/ && (cd "$tmp" && node skill.js --help)`
- 验证以 `--help`、`--version`、一条真实命令与一条错误路径为准，见 `.claude/agents/nodejs-expert.md`。
- `test/` 整体被 `.gitignore` 忽略，仅作为本地临时草稿区。

## 运行时架构

1. **打包 CLI**（30 个标准技能 + `kavita-lite`）：统一通过 `process.argv.slice(2)` 解析参数。
2. **无打包脚本**：`ocr_tool` 需 `npm install` 后直跑；`kavita-lite` 为手写 ESM。
3. **Agent-only**（18 个）：仅包含 `SKILL.md` 可执行运行手册，依赖外部工具/CLI。

## 当前技能

| 技能 | 类型 | 用途 |
|------|------|------|
| `88cha` | Bundled | 企业工商信息、关联企业与专利查询 |
| `agent-browser` | Agent-only | 浏览器自动化、截图与网页数据提取 |
| `baidu_search_nodejs` | Bundled | 百度千帆 AI 搜索（网页/文档/研究资料） |
| `brz_repair_manual_query` | Agent-only | 斯巴鲁 BRZ 维修手册查询 |
| `cmo-weather-query` | Bundled | 中国气象局天气预报与气象预警查询 |
| `db_client` | Bundled | 数据库客户端（MySQL/PG/SQLite + SSH 隧道） |
| `dianping-search` | Bundled | 大众点评商户与评分查询 |
| `drawio_nodejs` | Bundled | 私有化 draw.io 远程建图、节点与导出 |
| `doc_reader` | Bundled | Word 文档（.docx）转 Markdown/HTML |
| `documents_ripgrep` | Bundled | ripgrep + textract 代码与文档全文搜索 |
| `deepseek-search` | Bundled | DeepSeek 官方网页搜索与抓取，Key 存 .env |
| `excel-alasql` | Bundled | SQL 查询 Excel/CSV，支持中文列名 |
| `financial` | Bundled | 金融行情 API（金银期、A股、K线、新闻） |
| `figma-code-connect` | Agent-only | Figma 组件与代码映射 |
| `figma-create-design-system-rules` | Agent-only | 为 AI 助手生成设计系统规则 |
| `figma-create-new-file` | Agent-only | 创建空白 Figma 文件 |
| `figma-generate-design` | Agent-only | 从代码或描述构建 Figma 页面视图 |
| `figma-generate-library` | Agent-only | 从代码库构建 Figma 完整设计系统 |
| `figma-implement-design` | Agent-only | Figma 设计稿转生产代码 |
| `figma-use` | Agent-only | Figma Plugin API MCP 封装 |
| `file_code_box` | Agent-only | 文件快递柜匿名口令分享文本与文件 |
| `gaode_map` | Bundled | 高德地图地理编码、POI 与路径规划 |
| `gitea_api` | Bundled | Gitea REST API 仓库与镜像查询 |
| `game_mahjong_agent` | Bundled | AI 多人麻将游戏模拟器 |
| `happy_agent_easy` | Bundled | Happy Agent 远程会话管理客户端 |
| `hindsight` | Bundled | Hindsight 长期记忆 MCP 客户端 |
| `jina_reader` | Agent-only | Jina AI Reader 网页纯文本提取 |
| `kavita-lite` | Bundled（例外） | 豆瓣图书刮削与 Kavita 元数据回填 |
| `magpie-image-gen` | Scripts（例外） | Magpie 网关 AI 生图（零依赖脚本） |
| `magpie-tools` | Bundled | Magpie 网关 MCP 工具客户端（搜索与 SEO） |
| `makepad-进化` | Agent-only | 自我改进 Makepad 开发技能 |
| `markitdown_pdf` | Agent-only | PDF 转 Markdown 与视觉模型识别 |
| `mind-map-skill` | Bundled | 心智图 REST API 远程控制 |
| `memos-node` | Bundled | Memos 实例 REST API 客户端 |
| `ms_office_x_editer` | Bundled | Word/Excel 编辑与样式处理 |
| `nexus3-skill` | Bundled | Nexus3 仓库资产查询与组件删除 |
| `obsidian_cli` | Agent-only | Obsidian 本地知识库读写与任务交互 |
| `obsidian-bases` | Agent-only | Obsidian Bases 文件创建与编辑 |
| `obsidian-json-canvas` | Agent-only | JSON Canvas 文件创建与编辑 |
| `ocr_tool` | Bundled（例外） | 图片 OCR 识别（优先 LLM，备用本地库） |
| `opencode-go-usage` | Bundled | OpenCode Go 订阅用量与周期查询 |
| `sendmail` | Bundled | SMTP 邮件发送（支持附件与 Markdown） |
| `siyuan_api` | Bundled | 思源笔记 REST API 数据管理与 SQL 查询 |
| `smb-client` | Bundled | SMB/CIFS 局域网客户端（双引擎：系统CLI+纯JS） |
| `ssh2-node` | Bundled | SSH 客户端（exec/sftp/tunnel/keygen） |
| `use_http_mcp` | Bundled | 原生 HTTP 请求工具（REST + 鉴权） |
| `website_security_scan` | Agent-only | 网站安全扫描（Header/CORS/CSP/XSS） |
| `where-am-i` | Bundled | 公网 IP 地理位置与 ISP 查询 |
| `where-is-this` | Bundled | 经纬度逆地理编码 |
| `wikijs_api` | Bundled | Wiki.js GraphQL API 客户端 |
| `xiaomi-mimo-query` | Bundled | 小米 MiMo CodingPlan 用量与额度查询 |
| `x_release_by_agent_browser` | Agent-only | X/Twitter 自动化推文发布 |

## SKILL.md 与市场适配规范

YAML frontmatter 必须包含核心元数据；若需适配 WorkBuddy 等市场，需双语字段：

```yaml
---
name: skill-name
version: 1.0.0
display_name: 技能中文名
display_name_en: Skill English Name
description: 当用户要求"..."时使用此 skill。
description_zh: 中文简介（50-100字）
description_en: English description
skill_version: YYMMDD.HHmmSS    # build.js 自动注入
---
```

## 构建、模块化与动态 Require

1. **打包基线**：esbuild `platform: "node"`, `bundle: true`, `outfile: "skill.js"`，注入版本号 banner。
2. **动态 Require 兼容**：若三方库使用动态 require，esbuild 会编译为 `__glob` helper。
   构建脚本需注入扩展名回退补丁：`var fn = map[path2] || map[path2 + ".js"];`。
3. **模块化与编码**：CommonJS 规范，优先复用 Node 18+ 原生能力；错误统一输出 JSON 格式。
4. **配置优先级**：CLI 选项 > 环境变量 > 本地 `.env` > 默认值。真实密钥放 `.env` 且必须被忽略。

## 隐私红线与提交前脱敏（强制）

**禁止将私有信息提交到公开仓库。**
- 不得硬编码内网 IP、真实 token、密码、内部域名；示例统一使用 `*.example.com` 或 `localhost`。
- 每次 `git add` 后、`git commit` 前必须运行脱敏扫描，命中即停止：

```bash
# 1) 检查暂存区真实凭据赋值
git diff --cached -U0 | grep '^+' | grep -inE "(token|password|secret|api[_-]?key)[\"']?[[:space:]]*[:=][[:space:]]*[\"'][^\"']{8,}"
# 2) 检查暂存区内网 IP（10/8, 172.16/12, 192.168/16）
git diff --cached -U0 | grep '^+' | grep -inE "(^|[^0-9])(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3})([^0-9]|$)"
# 3) 检查密钥前缀与敏感私钥文件
git grep --cached -nIE "gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{40,}"
```

## 添加新技能与文件规范

1. 创建目录并编写 `SKILL.md`、`run.js`、`build.js`、`package.json`。
2. 执行 `pnpm install && pnpm run build` 生成 `skill.js`，运行 `node skill.js --help` 验证。
3. 若需上架市场，在技能目录下生成 512×512 PNG 图标并平铺打包为 zip。
4. 更新本文件与 README.md 技能索引表，提交前务必通过隐私扫描。

## Session 历史

**2026-07-26**：创建 nodejs-expert agent；修复 drawio_nodejs 内网 IP 泄露并重写历史，建立隐私红线。

**2026-10-17**：新增 deepseek-search，Key 存 `.env` 不入库；增加 `--dotenv-file` 参数规避 Node 原生冲突。

**2026-10-24**：补齐 5 个技能元数据；修复 ssh2-node sftp 在 Windows Git Bash 下远端绝对路径改写问题。

**2026-10-25**：新增 magpie-image-gen 脚本技能；审计修复 5 处路径与 IP 硬编码，补全超时与契约处理。

**2026-10-31**：新增 magpie-tools 客户端；解决网关流式 HTTP 免 initialize 调用与二次 JSON 解包问题。

**2026-11-04**：新增 smb-client 局域网共享技能（双引擎：系统 smbclient + 纯 JS 回退）。
修复 @marsaud/smb2 原型缺少 ensureDir 导致的崩溃（递归 exists+mkdir）；
修复 esbuild 0.28+ 动态 require 生成的 `__glob` 丢失 `.js` 后缀导致运行时未命中 bundle 的问题；
解决 rebase 冲突合并 `.gitignore`（保留 `.freebuff/`）；
完善 WorkBuddy 市场元数据字段规范（version/display_name 等）并生成 512×512 PNG 头像。
