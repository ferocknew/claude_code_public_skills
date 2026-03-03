---
name: documents_ripgrep
description: 当用户要求"搜索文档内容"、"在文件中查找关键词"、"搜索 Office 文件"、"全文检索"、"使用 ripgrep 搜索"时，或者需要在大量文档（包括文本文件和 Office 文件）中搜索特定内容时使用此 skill。
version: 260303.123455
---

# 使用 ripgrep 搜索文档内容

本 skill 提供使用 ripgrep 和 textract 搜索文档内容的完整指南。ripgrep 是一个极速的文本搜索工具，textract 用于提取 Office 文件的文本内容。

## 概述

这是一个强大的文档内容搜索工具，支持：
- **文本文件搜索**：使用 ripgrep 高效搜索各种文本文件
- **Office 文件搜索**：提取 .docx, .xlsx, .pptx 文件的文本内容并搜索
- **灵活的搜索选项**：支持正则表达式、大小写敏感、全词匹配等

## 运行方式

**直接运行，无需安装依赖：**

```bash
# 基本搜索
node skill.js <目录路径> <搜索关键词>

# 区分大小写
node skill.js <目录路径> <搜索关键词> -s

# 正则表达式
node skill.js <目录路径> <正则表达式> -e

# 全词匹配
node skill.js <目录路径> <关键词> -w
```

**重要：** 请使用文件的**绝对路径**或相对于当前目录的路径。

---

## 支持的文件格式

### 文本文件（ripgrep 直接搜索）

| 格式 | 说明 |
|------|------|
| 代码文件 | .js, .ts, .py, .java, .c, .cpp, .go, .rs, .rb, .php 等 |
| 配置文件 | .json, .yaml, .yml, .ini, .conf, .cfg |
| 标记文件 | .md, .txt, .html, .xml, .css, .scss |
| 脚本文件 | .sh, .bash, .zsh, .fish, .sql |
| 其他 | .csv, .log, .vue, .svelte, .astro |

### Office 文件（textract 提取）

| 格式 | 说明 | 支持程度 |
|------|------|----------|
| **DOCX** | Word 2007+ 格式 | ✅ 完全支持 |
| **XLSX** | Excel 2007+ 格式 | ✅ 完全支持 |
| **PPTX** | PowerPoint 2007+ 格式 | ✅ 完全支持 |

> ⚠️ 不支持 PDF 和旧版 Office 文件（.doc, .xls, .ppt），请转换为新版格式。

---

## 命令行选项

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助信息 |
| `-v, --version` | 显示版本信息 |
| `-i, --ignore-case` | 忽略大小写（默认） |
| `-s, --case-sensitive` | 区分大小写 |
| `-w, --word` | 全词匹配 |
| `-e, --regex` | 使用正则表达式 |
| `--no-office` | 跳过 Office 文件搜索 |
| `-m, --max-results N` | 最大结果数量（默认 100） |

---

## 使用示例

### 基本搜索

```bash
# 在目录中搜索关键词
node skill.js ~/Documents "重要"

# 在特定文件中搜索
node skill.js ./report.docx "总结"
```

### 高级搜索

```bash
# 区分大小写搜索
node skill.js ~/Documents "API" -s

# 正则表达式搜索（日期格式）
node skill.js ~/Documents "\\d{4}-\\d{2}-\\d{2}" -e

# 全词匹配
node skill.js ~/Documents "test" -w

# 限制结果数量
node skill.js ~/Documents "config" -m 50

# 只搜索文本文件，跳过 Office
node skill.js ~/Documents "function" --no-office
```

---

## 输出格式

搜索结果包含以下信息：

```
📄 /path/to/file.txt:10
   这是一行包含关键词的内容

📦 /path/to/document.docx:25
   这是 Office 文件中的匹配内容
```

- 📄 表示文本文件匹配
- 📦 表示 Office 文件匹配

---

## 性能说明

### ripgrep 优势

- **极快**：ripgrep 是目前最快的文本搜索工具之一
- **智能过滤**：自动忽略 .git, node_modules 等目录
- **内存高效**：流式处理，不会一次性加载大文件

### Office 文件处理

- 需要逐个提取文本内容，速度较慢
- 建议配合 `--max-results` 限制结果数量
- 对于大量 Office 文件，搜索时间可能较长

---

## 依赖安装

```bash
pnpm add -g textract
```

> .docx/.xlsx/.pptx 纯 JS 实现，无需额外系统依赖。

---

## 限制与注意事项

### 优势

- ✅ 跨平台兼容
- ✅ 支持中文和多种编码
- ✅ 无需本地安装（使用 npx）
- ✅ 支持正则表达式

### 限制

- **Office 文件**：仅支持新版格式（.docx, .xlsx, .pptx）
- **大文件**：超大 Office 文件可能需要较长处理时间
- **格式丢失**：Office 文件提取的是纯文本，不保留格式

---

## 输出格式

搜索结果以 Markdown 列表格式输出：

```markdown
- /absolute/path/to/file.md
  - ...上下文 **关键词** 上下文...
  - ...另一处 **关键词** 上下文...
- /absolute/path/to/another.docx
  - ...上下文 **关键词** 上下文...
```

**格式说明：**
- 每个文件作为一级列表项（显示绝对路径）
- 每个匹配作为二级列表项
- 关键词使用 `**粗体**` 高亮
- 上下文显示关键词前后各 20 个字符

---

## 常见问题

### Q: 支持 PDF 文件吗？

**A:** 不支持。本工具专注于文本文件和 Office 2007+ 格式（.docx, .xlsx, .pptx）。

### Q: 支持 .doc/.xls/.ppt 旧版格式吗？

**A:** 不支持。请将文件另存为新版格式（.docx, .xlsx, .pptx）。

### Q: 如何搜索特定类型的文件？

**A:** 目前支持自动识别文件类型。如需只搜索文本文件，使用 `--no-office` 选项。

### Q: 搜索速度慢怎么办？

**A:** 
1. 使用 `-m` 限制结果数量
2. 使用 `--no-office` 跳过 Office 文件
3. 缩小搜索目录范围

### Q: 支持中文搜索吗？

**A:** 完全支持中文搜索，包括文件名和文件内容。

---

## 快速开始

```bash
# 最简单的用法
node skill.js ~/Documents "搜索关键词"
```
