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
| `obsidian-bases` | Create/edit Obsidian Bases (.base) files with views, filters, formulas |
| `obsidian-json-canvas` | Create/edit JSON Canvas (.canvas) files with nodes, edges, groups |
| `makepad-evolution` | Self-improving Makepad development skill system |

## Adding New Skills

1. Create a new directory for the skill
2. Add a `SKILL.md` file with proper YAML frontmatter
3. Follow the existing skill documentation structure
4. The `description` field should indicate when Claude should use this skill

## Skill File Conventions

- **File naming**: `SKILL.md` (uppercase)
- **Directory naming**: lowercase-with-hyphens
- **Frontmatter format**: Valid YAML with `---` delimiters
- **Content**: Well-structured markdown with clear sections

## Development Workflow

This repository uses git for version control. All skill files are tracked in git.

### Viewing History
```bash
git log --oneline
git show HEAD:<skill-dir>/SKILL.md
```

### Recovering Deleted Files
If files show as deleted in git status:
```bash
git checkout HEAD -- <path>
```
