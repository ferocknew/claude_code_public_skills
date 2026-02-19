# Claude Code Skills Collection

这是一个 Claude Code 可加载的技能集合，每个目录包含一个用于特定领域的技能包。

## 可用技能

| 技能目录 | 名称 | 描述 |
|---------|------|------|
| `agent-browser` | Browser Automation | 浏览器自动化，用于网页测试、表单填充、截图和数据提取 |
| `excel-alasql` | Excel with AlaSQL | 使用 SQL 查询处理 Excel 文件（.xlsx、.xls、.csv），支持中文文件名和列名 |
| `makepad-进化` | Makepad Evolution | 自我改进的 Makepad 开发技能系统 |
| `obsidian-bases` | Obsidian Bases | 创建和编辑 Obsidian Bases (.base) 文件，支持视图、过滤器、公式 |
| `obsidian-json-canvas` | JSON Canvas | 创建和编辑 JSON Canvas (.canvas) 文件，支持节点、边、分组 |

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
