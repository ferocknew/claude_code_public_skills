# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库概览

**Claude Code Skills Collection**：Claude Code 可加载的技能集合，每个目录一个技能包。

技能分两类（另有 2 个结构例外）：
- **Bundled**：`run.js` + `build.js` + `package.json`，esbuild 打包为 `skill.js`，
  运行 `node skill.js <args>`。"零依赖"只对部分技能成立，见「构建与版本」。
- **Agent-only**：仅 `SKILL.md`，LLM 通过 MCP 工具或外部 CLI 驱动。
- **例外**：`kavita-lite` 是手写 ESM `skill.js`（无 `run.js`/`build.js`）；
  `ocr_tool` 直接运行 `run.js`（需 `npm install`，无 `build.js`/`skill.js`）。

## 常用命令

每个 Bundled 技能独立构建，仓库没有根 `package.json`、workspace、CI 或批量构建脚本：

```bash
cd <skill-dir>
pnpm install
pnpm run build          # 等价于 node build.js，产物 skill.js
node skill.js --help    # 冒烟验证
head -2 skill.js        # 首行 banner 含版本号
```

- 必须在技能目录内构建：`build.js` 不切换工作目录，`entryPoints` / `outfile` 是相对路径，
  从仓库根执行会把 `skill.js` 写到根目录。
- 零依赖验证：把 `skill.js` 复制到空临时目录后运行，确认不依赖 `node_modules`：
  `tmp=$(mktemp -d) && cp <skill-dir>/skill.js "$tmp"/ && (cd "$tmp" && node skill.js --help)`
- 没有测试框架、lint、format、类型检查，也没有 CI。变更后的验证以 `--help`、`--version`、
  一条真实命令和一条错误路径为准；完整清单见 `.claude/agents/nodejs-expert.md`。
- `test/` 被 `.gitignore` 整体忽略，是本地验证草稿区，不是可复现测试套件。
- 提交前隐私扫描：`git diff --cached | grep -iE "token|password|10\.0\."`

## 运行时架构

技能有三种运行形态：

1. **打包 CLI**（29 个标准技能 + `kavita-lite` 手写产物）：`run.js`（可含 `lib/`）经 esbuild
   打成 `skill.js`，执行 `node skill.js <command> [options]`。参数统一从
   `process.argv.slice(2)` 进入，但分发方式不统一（COMMANDS 注册表 / switch / if-else /
   入口内联），不能跨技能假设同一套解析器。
2. **无打包脚本**：`ocr_tool` 直接 `node run.js`（需 `npm install`）；`kavita-lite` 是手写
   ESM `skill.js`，没有 `run.js`/`build.js`。
3. **Agent-only**（18 个）：只有 `SKILL.md`，由 LLM 按其中步骤调用 MCP 工具或外部 CLI。
   这些文件是可执行运行手册，不是说明文档；依赖的外部能力包括 Figma MCP、`agent-browser`、
   Obsidian CLI、`curl`、Python venv（`markitdown_pdf`）、外部 `makepad-skills` 仓库等。

只有 `hindsight` 具备完整的
`parseArgs → resolveConfig → McpClient → handler → output → handleError` 调用链，
其他技能缺少其中一层或多层。文档覆盖也不统一：49 个技能目录中仅 11 个有独立
`CLAUDE.md`、8 个有 `README.md`，不要假定每个技能都有三文档。

## 当前技能

| 技能 | 类型 | 用途 |
|------|------|------|
| `88cha` | Bundled | 企业搜索（工商信息、关联企业、专利） |
| `agent-browser` | Agent-only | 浏览器自动化、截图、网页测试 |
| `baidu_search_nodejs` | Bundled | 百度千帆 AI 搜索（网页、文档、研究资料，默认精简 text 输出） |
| `brz_repair_manual_query` | Agent-only | 斯巴鲁 BRZ 维修手册查询 |
| `cmo-weather-query` | Bundled | 中国气象局天气查询 |
| `db_client` | Bundled | 数据库客户端（MySQL/PostgreSQL/SQLite + SSH 隧道） |
| `dianping-search` | Bundled | 大众点评商户搜索 |
| `drawio_nodejs` | Bundled | 私有化 draw.io 远程操作（建图、节点、连接、批量、导出、编辑 URL） |
| `doc_reader` | Bundled | 读取 .docx 转 Markdown/HTML |
| `documents_ripgrep` | Bundled | ripgrep + textract 全文搜索（代码+Office） |
| `deepseek-search` | Bundled | DeepSeek 搜索/抓取（网页搜索 + 网页转 Markdown，key 存 .env） |
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
| `gitea_api` | Bundled | Gitea REST API（仓库、包、容器镜像查询） |
| `game_mahjong_agent` | Bundled | AI 多人麻将游戏模拟器 |
| `happy_agent_easy` | Bundled | Happy Agent 远程会话管理客户端 |
| `hindsight` | Bundled | Hindsight 长期记忆 MCP 客户端（写入、检索、记忆管理） |
| `jina_reader` | Agent-only | Jina AI Reader 网页纯文本提取 |
| `kavita-lite` | Bundled（例外） | 豆瓣图书刮削与 Kavita 元数据回填（手写 ESM skill.js，无构建流程） |
| `makepad-进化` | Agent-only | 自我改进 Makepad 开发技能 |
| `markitdown_pdf` | Agent-only | PDF 读取（文字型转 Markdown，扫描件转图片走视觉模型） |
| `mind-map-skill` | Bundled | 心智图 REST API 远程控制 |
| `memos-node` | Bundled | Memos 实例 REST API 客户端（memo CRUD、归档、评论、表情、附件、用户） |
| `ms_office_x_editer` | Bundled | Word/Excel 编辑（替换、样式、表格、图片、diff） |
| `nexus3-skill` | Bundled | Nexus3 REST API（Basic Auth，查询仓库/组件/资产，删除 docker tag/npm/pypi/maven 组件，默认预览+--yes 执行） |
| `obsidian_cli` | Agent-only | Obsidian 知识库交互（读写、搜索、任务） |
| `obsidian-bases` | Agent-only | Obsidian Bases 文件创建/编辑 |
| `obsidian-json-canvas` | Agent-only | JSON Canvas 文件创建/编辑 |
| `ocr_tool` | Bundled（例外） | 图片 OCR（优先 LLM 读图，Windows 用 tesseract.js；run.js 直跑，需 npm install） |
| `opencode-go-usage` | Bundled | OpenCode Go 订阅用量查询（原生 fetch+完整浏览器头读 SSR 页面，滚动/每周/每月百分比+重置时间，auth cookie 认证） |
| `sendmail` | Bundled | SMTP 发送邮件（支持附件） |
| `siyuan_api` | Bundled | 思源笔记 REST API（增删改查、SQL、导出） |
| `ssh2-node` | Bundled | SSH 客户端（exec/shell/sftp/tunnel/keygen，零依赖打包） |
| `use_http_mcp` | Bundled | HTTP 请求工具（GET/POST/PUT/DELETE） |
| `website_security_scan` | Agent-only | 网站安全扫描（HTTP头、CORS、CSP、XSS） |
| `where-am-i` | Bundled | 公网 IP 地理位置查询 |
| `where-is-this` | Bundled | 经纬度逆地理编码 |
| `wikijs_api` | Bundled | Wiki.js GraphQL API 客户端 |
| `xiaomi-mimo-query` | Bundled | 小米 MiMo CodingPlan 用量查询（本月/计划/补偿 token 用量与百分比） |
| `x_release_by_agent_browser` | Agent-only | X/Twitter 自动发布推文 |

> 结构例外：`kavita-lite` 为手写 ESM `skill.js`（`package.json` 的 `type: module`，无
> `run.js`/`build.js`）；`ocr_tool` 直接运行 `run.js`（需 `npm install`，无 `build.js`/`skill.js`）。

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

目录名历史上同时存在下划线与连字符两种；frontmatter 的 `name` 一律 kebab-case，
与目录名不必相同。

Bundled skill 采用"瘦索引"模式：快速开始 + 命令总表（必须含写入命令）+
选项 + 认证 + FAQ，详细案例路由到 `examples/`。

## 构建与版本

29 个标准 Bundled 技能各自复制同一份 esbuild 模板，没有共享构建脚本：

```bash
cd <skill-dir>
pnpm install && pnpm run build   # run.js → skill.js
node skill.js --help             # 验证
```

模板基线：`platform: "node"`、`bundle: true`、`outfile: "skill.js"`、banner 写入版本号。
存量 `build.js` 有漂移：`target: "node18"` 只有 16 个、`define: { __VERSION }` 有 26 个；
修改时以目标技能的 `build.js` 为准，不要假定配置一致。

版本号格式 `YYMMDD.HHmmSS`，由 `getTimestamp()` 生成，构建时写回 SKILL.md。
存量技能的版本字段不统一（15 个用 `skill_version`，12 个用 `version`，1 个两者都写）；
新增技能统一使用 `skill_version`。

`external` 只用于 native 或可选模块，且清单因技能而异：
`db_client` external 掉数据库驱动（目标机仍需安装）；`ssh2-node` 只 external `cpu-features`
和 `sshcrypto.node`，`ssh2` 的 JS 本体被打进 bundle；`documents_ripgrep` 的 `rgPath`
指向 `node_modules`，裸拷贝会失效并回退系统 `rg`，Office 提取还要 `npx -y textract`
（需要 npm 与网络）。因此"打包产物零依赖"只对部分技能成立。

`skill.js` 是提交到仓库的产物；`node_modules` 被忽略。锁定文件以各目录 `pnpm-lock.yaml`
为准，仓库没有 pnpm workspace，不要新增根级 workspace。

## 模块化规范

Bundled skill 的 `lib/` 有三种实际形态：
- **单文件**（15/29）：全部逻辑在 `run.js`，没有 `lib/`
- **扁平 `lib/`**（6 个）：按领域拆模块，未必是 `api.js` + `commands.js`
- **`lib/cmd/`**（8 个）：`lib/cmd/<对象>.js` + `index.js` +
  `lib/parser.js` + `lib/env.js` + `lib/errors.js` + `lib/output.js`

公共模块是各技能内的复制品，不是共享库，行为并不一致（`output.js` 8 份、`parser.js` 7 份、
`errors.js` 6 份；失败输出有 stderr JSON、stdout JSON、纯文本三种，退出码 0/1/2/3 并存）。
`lib/cmd/index.js` 只是聚合层，命令分发仍在 `run.js`，命令函数签名因技能而异。
改某个技能时以该技能的实现为准，不要跨技能套用。

新代码编码规范：CommonJS（`require`/`module.exports`）、Node 18+ 全局 `fetch`、
错误按 `JSON.stringify({ error, message })` 输出、配置从环境变量读取、
中文注释与输出。`.env` 由各技能手写解析（无 dotenv 依赖），打包后
`path.join(__dirname, ".env")` 指向技能目录；新代码的配置优先级为
CLI > 环境变量 > `.env` > 默认值，存量实现有例外。

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
6. `.claude` 被 `.gitignore` 忽略；新增 `.claude/agents/*.md` 需 `git add -f`

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
修复 drawio_nodejs 内网 IP 泄露（`10.0.0.x` 硬编码），
filter-branch 重写历史 + force push；
将"隐私红线"写入本文件。

**2026-10-17**：新增 deepseek-search（DeepSeek 官方 Search / Fetch）。
Key 存 `.env` 不入库，首次使用缺 Key 时主动询问并写入；
`-k/--api-key` 单次传入；另加 `--dotenv-file` 规避 Node 20.6+ 对
argv 中 `--env-file` 的内置解析（目标文件不存在时 Node 直接以 9 退出）。

**2026-10-24**：同步 CLAUDE.md 与仓库现状——补齐 5 个技能、修正
`website_security_scan` 类型、加入常用命令与运行时架构、移除失效的 GitNexus 索引说明；
修复 ssh2-node sftp 在 Windows Git Bash 下的远端绝对路径改写，并补齐单文件父目录与目录目标语义。

## GitNexus

GitNexus 是本地可选索引工具：`.gitnexus` 被 `.gitignore` 忽略，仓库不包含其配置或
相关 skill 文件。需要时按本地安装使用，不要假定仓库内已有索引可用。
