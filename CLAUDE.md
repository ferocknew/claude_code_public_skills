# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Claude Code Skills Collection** repository. Each directory contains a skill that Claude Code can load to provide specialized capabilities in specific domains.

## Skill File Structure

Each skill directory contains a `SKILL.md` file with:
- **YAML frontmatter** (required): `name` and `description` fields
- **Markdown content**: Skill documentation, patterns, examples

```yaml
---
name: skill-name
description: Brief description of when to use this skill.
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
| `excel-alasql` | SQL query processing for Excel files (.xlsx, .xls, .csv), supports Chinese filenames and column names |
| `makepad-进化` | Self-improving Makepad development skill system |
| `obsidian-bases` | Create/edit Obsidian Bases (.base) files with views, filters, formulas |
| `obsidian-json-canvas` | Create/edit JSON Canvas (.canvas) files with nodes, edges, groups |
| `use-http-mcp` | HTTP request tool using Node.js native fetch API, supports GET/POST/PUT/DELETE/PATCH, Basic Auth, Bearer Token, file upload/download |

## Development Commands

### Use-HTTP-MCP Skill

The `use-http-mcp` skill uses esbuild for bundling into standalone scripts.

```bash
# Install dependencies
cd use-http-mcp
pnpm install

# Build standalone script (bundles run.js -> skill.js)
npm run build

# Run the unbundled version (requires Node.js 18+)
node run.js get <url>
node run.js post <url> '{"key": "value"}'

# Run the bundled version (no dependencies required)
node skill.js get <url>
node skill.js post <url> '{"key": "value"}'
```

**Version numbering**: The build script generates timestamp-based versions in format `YYMMDD.HHmmSS` and automatically updates `skill_version` in `SKILL.md`.

### Excel-AlaSQL Skill

The `excel-alasql` skill uses esbuild for bundling dependencies into standalone scripts.

```bash
# Install dependencies
cd excel-alasql
pnpm install

# Build standalone scripts (bundles run.js -> skill.js, quick-analyze.js -> skill-analyze.js)
npm run build

# Run the unbundled version (requires dependencies)
node run.js <file-path>
node quick-analyze.js <file-path>

# Run the bundled version (no dependencies required)
node skill.js <file-path>
node skill-analyze.js <file-path>
```

**Version numbering**: The build script generates timestamp-based versions in format `YYMMDD.HHmmSS` and automatically updates `skill_version` in `SKILL.md`.

### Doc Reader Skill

The `doc_reader` skill uses esbuild for bundling dependencies into standalone scripts.

```bash
# Install dependencies
cd doc_reader
pnpm install

# Build standalone script (bundles run.js -> skill.js)
npm run build

# Run the unbundled version (requires dependencies)
node run.js /path/to/document.docx

# Output raw markdown (no formatting)
node run.js /path/to/document.docx --raw

# Output HTML instead of Markdown
node run.js /path/to/document.docx --html
```

**Conversion flow**: DOCX -> Mammoth.js -> HTML -> Turndown -> Markdown

### DB Client Skill

The `db_client` skill uses esbuild for bundling dependencies into standalone scripts.

```bash
# Install dependencies
cd db_client
pnpm install

# Build standalone script (bundles run.js -> skill.js)
npm run build

# Run the unbundled version (requires dependencies)
node run.js mysql host:localhost,port:3306,user:root,password:123,database:testdb

# SSH tunnel connection
node run.js mysql --ssh host:server.com,user:ubuntu,password:sshpass --db host:localhost,port:3306,user:root,password:123,database:testdb
```

**Native modules**: `better-sqlite3` (SQLite) and `ssh2` (SSH tunnel) cannot be bundled and must be installed in the runtime environment.

## Architecture Highlights

### Excel-AlaSQL Column Mapping

AlaSQL does not support Chinese column names as SQL identifiers. The excel-alasql skill implements a **column mapping mechanism**:

1. Original columns (e.g., `层次`, `事件编号`) are mapped to `c0`, `c1`, `c2`...
2. SQL queries use mapped identifiers: `SELECT * WHERE c0 = '中间事件'`
3. Results are automatically converted back to original column names

**Key functions**:
- `mapColumns(data)` - Maps original column names to c0, c1...
- `unmapColumns(data, mapping)` - Converts query results back to original names

**SQL restrictions**: Only SELECT queries are allowed. UPDATE/DELETE/INSERT/CREATE/DROP/ALTER/TRUNCATE/REPLACE are blocked.

### Git Workflow

```bash
git log --oneline
git show HEAD:<skill-dir>/SKILL.md
git checkout HEAD -- <path>  # Recover deleted files
```

## Adding New Skills

1. Create a new directory for the skill (lowercase-with-hyphens)
2. Add a `SKILL.md` file with proper YAML frontmatter
3. The `description` field should clearly indicate when Claude should use this skill
4. Update this CLAUDE.md and README.md to include the new skill

## File Conventions

- **Skill files**: `SKILL.md` (uppercase)
- **Skill directories**: `lowercase-with-hyphens`
- **Frontmatter**: Valid YAML with `---` delimiters

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
