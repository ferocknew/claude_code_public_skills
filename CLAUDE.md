# CLAUDE.md

本仓库的 Claude Code 开发指导文件。

## 仓库概览

**Claude Code Skills Collection**：Claude Code 可加载的技能集合，每个目录一个技能包。

技能分两类：
- **Bundled**：`run.js` + `build.js` + `package.json`，esbuild 打包为独立 `skill.js`（零依赖），
  运行 `node skill.js <args>`
- **Agent-only**：仅 `SKILL.md`，LLM 通过 MCP 工具或 CLI 命令驱动

## 当前技能

| 技能 | 类型 | 用途 |
|------|------|------|
| `88cha` | Bundled | 企业搜索（工商信息、关联企业、专利） |
| `agent-browser` | Agent-only | 浏览器自动化、截图、网页测试 |
| `brz_repair_manual_query` | Agent-only | 斯巴鲁 BRZ 维修手册查询 |
| `cmo-weather-query` | Bundled | 中国气象局天气查询 |
| `db_client` | Bundled | 数据库客户端（MySQL/PostgreSQL/SQLite + SSH 隧道） |
| `dianping-search` | Bundled | 大众点评商户搜索 |
| `drawio_nodejs` | Bundled | 私有化 draw.io 远程操作（建图、节点、连接、批量、导出、编辑 URL） |
| `doc_reader` | Bundled | 读取 .docx 转 Markdown/HTML |
| `documents_ripgrep` | Bundled | ripgrep + textract 全文搜索（代码+Office） |
| `excel-alasql` | Bundled | SQL 查询 Excel，支持中文列名 |
| `financial` | Bundled | 金融信息 API（金银期、A股、K线、新闻） |
| `figma-code-connect` | Agent-only | Figma 组件与代码映射 |
| `figma-create-design-system-rules` | Agent-only | AI 编码助手设计系统规则生成 |
| `figma-create-new-file` | Agent-only | 创建空白 Figma 文件 |
| `figma-generate-design` | Agent-only | 从代码/描述构建 Figma 页面 |
| `figma-generate-library` | Agent-only | 从代码库构建 Figma 设计系统 |
| `figma-implement-design` | Agent-only | Figma 设计稿转生产代码 |
| `figma-use` | Agent-only | Figma Plugin API MCP 封装 |
| `file_code_box` | Agent-only | 匿名口令分享文本和文件 |
| `gaode_map` | Bundled | 高德地图（地理编码、POI、路径、路况） |
| `game_mahjong_agent` | Bundled | AI 多人麻将游戏模拟器 |
| `happy_agent_easy` | Bundled | Happy Agent 远程会话管理客户端 |
| `jina_reader` | Agent-only | Jina AI Reader 网页纯文本提取 |
| `makepad-进化` | Agent-only | 自我改进 Makepad 开发技能 |
| `mind-map-skill` | Bundled | 心智图 REST API 远程控制 |
| `ms_office_x_editer` | Bundled | Word/Excel 编辑（替换、样式、表格、图片、diff） |
| `nexus3-skill` | Bundled | Nexus3 REST API（Basic Auth，查询仓库/组件/资产，删除 docker tag/npm/pypi/maven 组件，默认预览+--yes 执行） |
| `obsidian_cli` | Agent-only | Obsidian 知识库交互（读写、搜索、任务） |
| `obsidian-bases` | Agent-only | Obsidian Bases 文件创建/编辑 |
| `obsidian-json-canvas` | Agent-only | JSON Canvas 文件创建/编辑 |
| `sendmail` | Bundled | SMTP 发送邮件（支持附件） |
| `siyuan_api` | Bundled | 思源笔记 REST API（增删改查、SQL、导出） |
| `use_http_mcp` | Bundled | HTTP 请求工具（GET/POST/PUT/DELETE） |
| `website_security_scan` | Bundled | 网站安全扫描（HTTP头、CORS、CSP、XSS） |
| `where-am-i` | Bundled | 公网 IP 地理位置查询 |
| `where-is-this` | Bundled | 经纬度逆地理编码 |
| `wikijs_api` | Bundled | Wiki.js GraphQL API 客户端 |
| `x_release_by_agent_browser` | Agent-only | X/Twitter 自动发布推文 |

> 各 skill 用法和架构详见其目录下 `SKILL.md` 和 `CLAUDE.md`。

## SKILL.md 规范

YAML frontmatter 必须包含 `name`（kebab-case）和 `description`（说明"何时使用"，
触发词覆盖查询+写入意图）。

```yaml
---
name: skill-name
description: 当用户要求"..."时使用此 skill。
skill_version: YYMMDD.HHmmSS    # build.js 自动更新，不要手填
---
```

Bundled skill 采用"瘦索引"模式：快速开始 + 命令总表（必须含写入命令）+
选项 + 认证 + FAQ，详细案例路由到 `examples/`。

## 构建与版本

所有 Bundled skill 共享 esbuild 打包流程：

```bash
cd <skill-dir>
pnpm install && pnpm run build   # run.js → skill.js（零依赖）
node skill.js --help             # 验证
```

`build.js` 标准配置：`platform: "node"`、`target: "node18"`、`bundle: true`、
`define: { __VERSION }` 注入版本号，自动更新 SKILL.md 的 `skill_version`。

版本号格式 `YYMMDD.HHmmSS`，由 `getTimestamp()` 生成。

native 模块（`better-sqlite3`、`ssh2`）须加 `external`，不能打进 bundle。

## 模块化规范

Bundled skill 的 `lib/` 有两种模式：
- **扁平模式**（简单 skill）：`lib/api.js` + `lib/commands.js`
- **cmd 子目录**（复杂 skill）：`lib/cmd/<对象>.js` + `index.js` +
  `lib/parser.js` + `lib/env.js` + `lib/errors.js` + `lib/output.js`

编码规范：CommonJS（`require`/`module.exports`）、Node 18+ 全局 `fetch`、
错误统一 `JSON.stringify({ error, message })` 输出、配置从环境变量读取、
中文注释与输出。

## 隐私红线

**禁止将私有信息提交到 GitHub。** 本仓库为公开仓库。

- 代码/SKILL.md/help 不得硬编码内网 IP、token、密码、内部域名
- 默认值用 `localhost` 或占位符，真实地址由 `.env` 注入
- `.env`/cookie/私钥文件必须被 `.gitignore`
- `skill.js` 打包会将 `lib/` 源码原样打进 bundle，隐私检查必须在源码层做
- 提交前扫描：
  `git diff --cached | grep -iE "token|password|10\.0\."`

> Node.js skill 专家 agent：`.claude/agents/nodejs-expert.md`
> 内置撰写规范、隐私检查和验证清单。

## 添加新技能

1. 创建目录（短名用下划线如 `db_client`，多词用连字符如 `agent-browser`）
2. 添加 `SKILL.md`（frontmatter: name + description）
3. Bundled skill：添加 `run.js` + `build.js` + `package.json` + `lib/`
4. `pnpm install && pnpm run build` 打包，`node skill.js --help` 验证
5. 更新本文件和 README.md 的技能表格

## 文件规范

| 项目 | 规范 |
|------|------|
| Skill 文档 | `SKILL.md`（大写） |
| 打包入口 | `run.js`（开发）→ `skill.js`（产物，提交仓库） |
| 打包脚本 | `build.js`，esbuild，仅 devDep: esbuild |
| 模块化 | `lib/cmd/*.js` + `lib/cmd/index.js` |
| 版本号 | `YYMMDD.HHmmSS`，build.js 自动更新 |

子 skill 三文档模型：`SKILL.md`（LLM 运行时）、
`CLAUDE.md`（开发指导）、`README.md`（人类用户）。

## Session 历史

**2026-07-26**：创建 nodejs-expert agent（内置撰写规范）；
修复 drawio_nodejs 内网 IP 泄露（`10.0.0.40` 硬编码），
filter-branch 重写历史 + force push；
将"隐私红线"写入 agent 和本文件。

## GitNexus MCP

本项目由 GitNexus 索引（149 symbols）。
代码理解/调试/影响分析任务先读
`gitnexus://repo/claude_code_public_skills/context`。

| 任务 | Skill 文件 |
|------|-----------|
| 理解架构 | `.claude/skills/gitnexus/exploring/SKILL.md` |
| 爆炸半径 | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| 追踪 bug | `.claude/skills/gitnexus/debugging/SKILL.md` |
| 重命名/重构 | `.claude/skills/gitnexus/refactoring/SKILL.md` |

工具：`query`（代码智能）、`context`（符号全景）、
`impact`（爆炸半径）、`detect_changes`（git diff）、
`rename`（协同重命名）、`cypher`（图查询）。
