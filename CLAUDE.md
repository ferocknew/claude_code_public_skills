# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Claude Code Skills Collection** repository. Each directory contains a skill that Claude Code can load to provide specialized capabilities in specific domains.

**核心特点：**
- 所有 skill 都打包为独立的 `skill.js` 文件，无需安装依赖即可运行
- 使用 esbuild 进行打包，自动生成时间戳版本号（YYMMDD.HHmmSS）
- 支持中文文件名、中文列名等国际化场景

## Skill 文件结构

每个 skill 目录包含：

```
skill-name/
├── SKILL.md          # 技能定义文件（必需）- 告诉 LLM 如何使用这个 skill
├── CLAUDE.md         # AI 开发工具指引（可选）- 包含项目架构和开发规范
├── README.md         # 用户文档（可选）- skill 的完整使用说明
├── run.js            # 源代码文件
├── skill.js          # 打包后的独立文件（包含所有依赖）
├── build.js          # 打包脚本
└── package.json      # 依赖配置
```

### SKILL.md 格式

```yaml
---
name: skill-name
description: Brief description of when to use this skill.
version: 1.0.0
skill_version: YYMMDD.HHmmSS  # 由 build.js 自动生成
---

# Skill Documentation

Detailed content...
```

## Current Skills

| Skill | Purpose |
|-------|---------|
| `agent-browser` | Browser automation, form filling, screenshots, web testing |
| `db_client` | Database client supporting MySQL, PostgreSQL, SQLite with SSH tunnel connection |
| `doc_reader` | Read Microsoft Word documents (.docx) and convert to Markdown or HTML format |
| `documents_ripgrep` | Search document content using ripgrep, supports Office files and text files |
| `excel-alasql` | SQL query processing for Excel files (.xlsx, .xls, .csv), supports Chinese filenames and column names |
| `happy_agent_easy` | Simplified Happy Agent client for remote session management with optimized output format |
| `jina_reader` | Read web content using Jina AI Reader API |
| `makepad-进化` | Self-improving Makepad development skill system |
| `obsidian_cli` | Interact with Obsidian vault using CLI - read, search, create notes, manage tasks, tags, properties |
| `obsidian-bases` | Create/edit Obsidian Bases (.base) files with views, filters, formulas |
| `obsidian-json-canvas` | Create/edit JSON Canvas (.canvas) files with nodes, edges, groups |
| `sendmail` | Send emails via SMTP in Node.js environment |
| `use-http-mcp` | HTTP request tool using Node.js native fetch API, supports GET/POST/PUT/DELETE/PATCH, Basic Auth, Bearer Token, file upload/download |

## Development Commands

### 通用构建流程

所有 skill 都使用相同的构建模式：

```bash
# 1. 进入 skill 目录
cd <skill-name>

# 2. 安装依赖
pnpm install

# 3. 构建独立脚本（打包 run.js -> skill.js）
npm run build

# 4. 运行
node skill.js [参数]
```

**构建特点：**
- 使用 esbuild 打包所有依赖到 `skill.js`
- 自动生成时间戳版本号（YYMMDD.HHmmSS）
- 自动更新 SKILL.md 中的 `skill_version` 字段
- 打包后的文件无需安装依赖即可运行

### Happy Agent Easy Skill

```bash
cd happy_agent_easy
pnpm install
npm run build

# 查看所有会话
node skill.js list

# 查看活跃会话
node skill.js list --active

# 查看会话状态
node skill.js status <session-id>

# 查看会话历史
node skill.js history <session-id> 10

# 发送消息
node skill.js send <session-id> "消息内容"

# 获取当前会话 ID
node skill.js whoami
```

**重要提示：**
- 发送消息后需等待 3-5 秒，然后使用 `history` 查看回复
- 定时任务使用 `CronCreate`，但必须在消息中要求对方回调通知

### Use-HTTP-MCP Skill

```bash
cd use-http-mcp
pnpm install
npm run build

# GET 请求
node skill.js get <url>

# POST 请求
node skill.js post <url> '{"key": "value"}'

# 带认证
node skill.js get <url> -u user:pass
node skill.js get <url> -b token

# 获取 MCP 工具列表
node skill.js get <mcp-server-url> -b <token> --mcp-tools
```

### Excel-AlaSQL Skill

```bash
cd excel-alasql
pnpm install
npm run build

# 数据概览（显示列名映射表）
node skill.js <文件路径>

# 关键词搜索
node skill.js <文件路径> "关键词"

# SQL 查询（使用映射后的列名 c0, c1...）
node skill.js <文件路径> "SELECT * WHERE c0 = '值'"

# 导出 JSON
node skill.js <文件路径> "*" > output.json

# 快速分析
node skill-analyze.js <文件路径>
```

### Doc Reader Skill

```bash
cd doc_reader
pnpm install
npm run build

# 转换为 Markdown
node skill.js /path/to/document.docx

# 转换为 HTML
node skill.js /path/to/document.docx --html

# 原始 Markdown（无格式化）
node skill.js /path/to/document.docx --raw
```

### DB Client Skill

```bash
cd db_client
pnpm install
npm run build

# MySQL 连接
node skill.js mysql host:localhost,port:3306,user:root,password:123,database:testdb

# PostgreSQL 连接
node skill.js postgresql host:localhost,port:5432,user:postgres,password:123,database:testdb

# SQLite 连接
node skill.js sqlite database:/path/to/database.db

# SSH 隧道连接
node skill.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:123,database:testdb
```

**注意：** `better-sqlite3` 和 `ssh2` 无法打包，需要在运行环境中安装。

### Sendmail Skill

```bash
cd sendmail
pnpm install
npm run build

# 发送纯文本邮件
node skill.js --host smtp.example.com --port 587 --user user@example.com --pass password --from user@example.com --to recipient@example.com --subject "主题" --text "内容"

# 发送 HTML 邮件
node skill.js ... --html "<h1>标题</h1><p>内容</p>"

# 发送 Markdown 邮件
node skill.js ... --markdown "# 标题\n\n内容"

# 添加附件
node skill.js ... --attach /path/to/file.pdf
```

### Documents Ripgrep Skill

```bash
cd documents_ripgrep
pnpm install
npm run build

# 搜索文档内容
node skill.js <搜索关键词> <目录路径>

# 指定文件类型
node skill.js "关键词" <目录> --type pdf --type docx

# 递归搜索
node skill.js "关键词" <目录> -r
```

## Architecture Highlights

### 列名映射机制（Excel-AlaSQL）

AlaSQL 不支持中文列名作为 SQL 标识符，excel-alasql skill 实现了**列名映射机制**：

1. 原始列名（如 `层次`、`事件编号`）自动映射为 `c0`、`c1`、`c2`...
2. SQL 查询使用映射后的标识符：`SELECT * WHERE c0 = '中间事件'`
3. 查询结果自动转换回原始列名

**核心函数：**
- `mapColumns(data)` - 将原始列名映射为 c0, c1...
- `unmapColumns(data, mapping)` - 将查询结果转换回原始列名

**SQL 限制：**
- 仅支持 SELECT 查询
- 禁止 UPDATE/DELETE/INSERT/CREATE/DROP/ALTER/TRUNCATE/REPLACE
- 支持 COUNT、SUM、AVG、MAX、MIN 等聚合函数
- 支持 GROUP BY 分组统计

**使用建议：**
- 使用 LIMIT 限制结果数量，避免数据溢出
- 先过滤再 JOIN，提高性能
- 只选择需要的列，而非 `SELECT *`

### 回调通知机制（Happy Agent Easy）

Happy Agent Easy 使用两种回调机制确保任务执行结果的通知：

**方式一：使用 --callback 参数（推荐用于 send 命令）**
```bash
node skill.js send <目标session> "你的任务" --callback <你的session>
```

这会在消息中附加隐藏指令，提示对方完成后通知你。

**方式二：在消息中明确要求回复（推荐用于 CronCreate 定时任务）**

定时任务消息中**必须**使用此方式：

```markdown
完成任务。

【重要】任务完成后，请立即使用以下命令通知我：
happy-agent send <你的session> "[完成通知] 任务已完成"
```

**定时任务限制：**
- 最小粒度为 1 分钟（标准 cron 不支持秒级）
- 最长有效期 3 天，之后自动过期
- 必须在消息中强制要求回调通知

### MCP 服务器支持（Use-HTTP-MCP）

支持三种 MCP 服务器实现方式：

**1. REST API 风格（如 SearXNG）**
- 提供 `/api/mcp` 端点获取工具列表
- 每个工具对应一个 HTTP 端点

**2. MCP JSON-RPC 风格**
- 使用 `/mcp` 端点
- 需要 `initialize` + `tools/list` 流程

**3. OpenAPI 风格（如 Memory）**
- 提供 `/openapi.json` 规范
- 工具位于 `/tools/*` 路径下

### 文档转换流程（Doc Reader）

DOCX -> Mammoth.js -> HTML -> Turndown -> Markdown

**转换选项：**
- 默认：格式化的 Markdown
- `--raw`：原始 Markdown（无格式化）
- `--html`：输出 HTML 格式

### 原生模块限制（DB Client）

以下模块无法打包，需要在运行环境中安装：
- `better-sqlite3` - SQLite 数据库驱动
- `ssh2` - SSH 隧道连接

### 构建流程统一模式

所有 skill 的 `build.js` 都遵循相同的模式：

```javascript
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 生成时间戳版本号
const now = new Date();
const version = now.toISOString().slice(2, 10).replace(/[-:T]/g, '').replace(
  /(\d{6})(\d{6})/, '$1.$2'
).substring(0, 15);

// 打包配置
esbuild.build({
  entryPoints: ['run.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'skill.js',
  // 定义版本号
  define: { 'process.env.SKILL_VERSION': `"${version}"` }
});

// 更新 SKILL.md 中的版本号
const skillMd = fs.readFileSync('SKILL.md', 'utf8');
const updated = skillMd.replace(
  /skill_version: .*/,
  `skill_version: ${version}`
);
fs.writeFileSync('SKILL.md', updated);
```

## Git Workflow

```bash
# 查看提交历史
git log --oneline

# 查看文件历史版本
git show HEAD:<skill-dir>/SKILL.md

# 恢复已删除文件
git checkout HEAD -- <path>

# 查看修改状态
git status

# 查看差异
git diff
```

## Adding New Skills

1. 创建新的 skill 目录（使用小写字母和连字符）
2. 添加 `SKILL.md` 文件，包含 YAML frontmatter
3. `description` 字段应清晰说明何时使用此 skill
4. 创建 `run.js` 源代码文件
5. 创建 `build.js` 打包脚本（参考其他 skill 的模板）
6. 运行 `pnpm install` 和 `npm run build` 生成 `skill.js`
7. 更新本文件（CLAUDE.md）和 README.md，在技能列表中添加新 skill

## File Conventions

- **Skill 文件**: `SKILL.md`（大写）
- **Skill 目录**: `lowercase-with-hyphens`（小写+连字符）
- **Frontmatter**: 使用 `---` 分隔符的有效 YAML
- **版本号**: 格式为 `YYMMDD.HHmmSS`，由构建脚本自动生成
- **文档定位**:
  - `SKILL.md` - 告诉 LLM 如何使用
  - `CLAUDE.md` - AI 开发助手指引
  - `README.md` - 用户使用说明

## 常见问题

### Q: 如何选择使用哪个 skill？

A: 根据 SKILL.md 中的 `description` 字段判断。每个 skill 的 description 都明确说明了触发条件。

### Q: 打包后的 skill.js 文件可以独立运行吗？

A: 是的，所有依赖都已打包进 `skill.js`，无需安装依赖即可运行。例外：`db_client` 的 `better-sqlite3` 和 `ssh2` 需要在运行环境安装。

### Q: 为什么 excel-alasql 的 SQL 查询要用 c0, c1 这样的列名？

A: AlaSQL 不支持中文列名作为 SQL 标识符。工具会自动将原始列名映射为 c0, c1...，查询结果会自动转换回原始列名。

### Q: Happy Agent 定时任务为什么最长只有 3 天？

A: CronCreate 工具设计的任务最长有效期为 3 天，长期任务需要在过期前重新创建。

### Q: 如何获取 MCP 服务器的工具列表？

A: 使用 `use-http-mcp` skill 的 `--mcp-tools` 选项：
```bash
node skill.js get <mcp-server-url> -b <token> --mcp-tools
```

<!-- gitnexus:start -->
# GitNexus MCP

This project is indexed by GitNexus as **claude_code_public_skills** (149 symbols, 240 relationships, 3 execution flows).

GitNexus provides a knowledge graph over this codebase — call chains, blast radius, execution flows, and semantic search.

## Always Start Here

For any task involving code understanding, debugging, impact analysis, or refactoring, you must:

1. **Read `gitnexus://repo/{name}/context`** — codebase overview + check index freshness
2. **Match your task to a skill below** and **read that skill file**
3. **Follow the skill's workflow and checklist**

> If step 1 warns the index is stale, run `npx gitnexus analyze` in the terminal first.

## Skills

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/refactoring/SKILL.md` |

## Tools Reference

| Tool | What it gives you |
|------|-------------------|
| `query` | Process-grouped code intelligence — execution flows related to a concept |
| `context` | 360-degree symbol view — categorized refs, processes it participates in |
| `impact` | Symbol blast radius — what breaks at depth 1/2/3 with confidence |
| `detect_changes` | Git-diff impact — what do your current changes affect |
| `rename` | Multi-file coordinated rename with confidence-tagged edits |
| `cypher` | Raw graph queries (read `gitnexus://repo/{name}/schema` first) |
| `list_repos` | Discover indexed repos |

## Resources Reference

Lightweight reads (~100-500 tokens) for navigation:

| Resource | Content |
|----------|---------|
| `gitnexus://repo/{name}/context` | Stats, staleness check |
| `gitnexus://repo/{name}/clusters` | All functional areas with cohesion scores |
| `gitnexus://repo/{name}/cluster/{clusterName}` | Area members |
| `gitnexus://repo/{name}/processes` | All execution flows |
| `gitnexus://repo/{name}/process/{processName}` | Step-by-step trace |
| `gitnexus://repo/{name}/schema` | Graph schema for Cypher |

## Graph Schema

**Nodes:** File, Function, Class, Interface, Method, Community, Process
**Edges (via CodeRelation.type):** CALLS, IMPORTS, EXTENDS, IMPLEMENTS, DEFINES, MEMBER_OF, STEP_IN_PROCESS

```cypher
MATCH (caller)-[:CodeRelation {type: 'CALLS'}]->(f:Function {name: "myFunc"})
RETURN caller.name, caller.filePath
```

<!-- gitnexus:end -->
