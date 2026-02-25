---
name: doc_reader
description: 当用户要求"读取 Word 文档"、"解析 DOCX 文件"、"将 Word 转换为 Markdown"、"提取文档内容"、"读取 docx"时，或者需要在 JavaScript/Node.js 环境中读取 Microsoft Word 文档（.docx）并转换为 Markdown、HTML 或纯文本格式时使用此 skill。
version: 260225.154019
---

# DOCX 文档读取工具

本 skill 提供读取 Microsoft Word 文档（.docx）并将其转换为 Markdown 或 HTML 格式的功能，方便 LLM 处理和进一步分析。

## 概述

使用 **Mammoth.js** 将 DOCX 转换为 HTML，然后使用 **Turndown** 将 HTML 转换为 Markdown。这种转换链能最大程度保留文档的格式和结构。

## 运行方式

**直接运行，无需安装依赖：**

```bash
# 读取文档并输出 Markdown（默认）
node skill.js <docx文件路径>

# 只输出原始 Markdown Markdown
node skill.js <docx文件路径> --raw

# 输出纯文本格式（去除所有 Markdown 标记，最节省 Token）
node skill.js <docx文件路径> --txt

# 输出 HTML 格式
node skill.js <docx文件路径> --html
```

**重要：** 请使用文件的**绝对路径**，例如：
- Windows: `D:\data\文档.docx` 或 `D:/data/文档.docx`
- macOS/Linux: `/home/user/data/文档.docx`

---

## 支持的文件格式

| 格式 | 说明 | 支持程度 |
|------|------|----------|
| **DOCX** | Microsoft Word 2007+ 格式 | ✅ 完全支持 |
| **DOC** | Microsoft Word 97-2003 格式 | ❌ 不支持（请另存为 DOCX） |
| **RTF** | 富文本格式 | ❌ 不支持 |

---

## 何时使用此工具

在以下情况使用此 skill：
- 需要读取 Word 文档内容进行分析
- 需要将 Word 文档转换为 Markdown 格式
- 需要将 Word 文档转换为纯文本格式（节省 Token）
- 需要将 Word 文档转换为 HTML 格式
- 需要提取文档内容供 LLM 处理
- 需要批量处理 Word 文档

---

## 输出格式

### Markdown 格式（默认）

使用 `--raw` 选项只输出纯 Markdown：

```markdown
# 文档标题

这是一段正文内容。

## 章节标题

- 列表项 1
- 列表项 2
- 列表项 3

**加粗文本** 和 *斜体文本*。
```

### 纯文本格式（最节省 Token）

使用 `--txt` 选项输出纯文本（去除所有 Markdown 标记）：

```
微信小程序风格设计合同

委托方（甲方）：

法定代表人：

地址：
...
```

这是最节省 Token 的格式，推荐在需要将文档内容传递给 LLM 时使用。

### HTML 格式

使用 `--html` 选项输出 HTML：

```html
<h1>文档标题</h1>
<p>这是一段正文内容。</p>
<h2>章节标题</h2>
<ul>
  <li>列表项 1</li>
  <li>列表项 2</li>
  <li>列表项 3</li>
</ul>
```

---

## 快速开始

### Linux/macOS/WSL/Git Bash

```bash
# 读取文档
node skill.js /path/to/document.docx

# 只输出原始 Markdown
node skill.js /path/to/document.docx --raw

# 输出纯文本格式（去除所有 Markdown 标记）
node skill.js /path/to/document.docx --txt

# 输出 HTML
node skill.js /path/to/document.docx --html
```

### Windows (CMD/PowerShell)

```cmd
# 读取文档
node skill.js D:\docs\document.docx

# 只输出原始 Markdown
node skill.js D:\docs\document.docx --raw

# 输出纯文本格式（去除所有 Markdown 标记）
node skill.js D:\docs\document.docx --txt

# 输出 HTML
node skill.js D:\docs\document.docx --html
```

---

## 功能说明

| 操作 | 说明 | 示例 |
|------|------|------|
| **默认** | 读取文档并输出带格式的 Markdown | `skill.js doc.docx` |
| **--raw** | 只输出原始 Markdown，不添加任何格式 | `skill.js doc.docx --raw` |
| **--txt** | 输出纯文本格式（去除所有 Markdown 标记，最节省 Token） | `skill.js doc.docx --txt` |
| **--html** | 输出 HTML 格式 | `skill.js doc.docx --html` |

---

## 工具文件说明

| 文件 | 说明 |
|------|------|
| **skill.js** | 主工具，包含所有依赖，无需安装 |

---

## 常见问题

### Q: 首次使用需要做什么？

**A:** 无需任何安装，直接运行 `node skill.js <文件>` 即可！

### Q: 支持 DOC 格式吗？

**A:** 不支持。本工具仅支持 DOCX 格式（Microsoft Word 2007+）。如需处理旧版 DOC 文件，请先在 Word 中另存为 DOCX 格式。

### Q: 转换后的格式会完全保持一致吗？

**A:** 转换工具会尽可能保留原始格式，但某些复杂格式（如特殊字体、复杂表格样式、文本框、图片环绕等）可能无法完全保留。建议转换后检查重要文档。

### Q: 支持批量处理吗？

**A:** 目前 skill.js 是单文件处理工具。如需批量处理，可以使用 shell 脚本或编写 Node.js 脚本循环调用：

```bash
# bash 示例
for file in *.docx; do
  node skill.js "$file" --raw > "${file%.docx}.md"
done
```

---

## 技术实现

### 转换流程

```
DOCX --(Mammoth.js)--> HTML --(Turndown)--> Markdown
```

1. **Mammoth.js**: 将 DOCX 转换为语义化的 HTML，专注于语义而非样式
2. **Turndown**: 将 HTML 转换为 Markdown，保持文档结构

### 保留的格式

- 标题（Heading 1-6）
- 段落和换行
- 列表（有序/无序）
- 粗体和斜体
- 表格（基础结构）
- 超链接

### 可能丢失的格式

- 复杂表格样式
- 文本框和形状
- 图片（会被提取但 Markdown 引用需要额外处理）
- 页眉页脚
- 页码
- 特殊字体和颜色
