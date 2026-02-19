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
| `excel-alasql` | SQL query processing for Excel files (.xlsx, .xls, .csv), supports Chinese filenames and column names |
| `makepad-进化` | Self-improving Makepad development skill system |
| `obsidian-bases` | Create/edit Obsidian Bases (.base) files with views, filters, formulas |
| `obsidian-json-canvas` | Create/edit JSON Canvas (.canvas) files with nodes, edges, groups |

## Development Commands

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
