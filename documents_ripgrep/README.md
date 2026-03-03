# documents-ripgrep

使用 ripgrep 和 textract 搜索文档内容的工具。

## 技术方案

- **ripgrep**：高效搜索文本文件
- **textract**：提取 Office 文件文本内容

### 支持的文件类型

**文本文件（ripgrep 直接搜索）：**
- 代码文件：.js, .ts, .py, .java, .c, .cpp, .go, .rs, .rb, .php 等
- 配置文件：.json, .yaml, .yml, .ini, .conf
- 标记文件：.md, .txt, .html, .xml, .css
- 脚本文件：.sh, .bash, .zsh, .sql

**Office 文件（textract 提取）：**
- .docx（Word 2007+）
- .xlsx（Excel 2007+）
- .pptx（PowerPoint 2007+）

> ⚠️ 不支持 PDF 和旧版 Office 文件（.doc, .xls, .ppt）。

## 快速开始

```bash
# 基本搜索
node skill.js <目录路径> <搜索关键词>

# 区分大小写
node skill.js <目录路径> <关键词> -s

# 正则表达式
node skill.js <目录路径> <正则表达式> -e

# 全词匹配
node skill.js <目录路径> <关键词> -w

# 限制结果数量
node skill.js <目录路径> <关键词> -m 50
```

## 命令行选项

| 选项 | 说明 |
|------|------|
| `-h, --help` | 显示帮助信息 |
| `-s, --case-sensitive` | 区分大小写 |
| `-e, --regex` | 使用正则表达式 |
| `-w, --word` | 全词匹配 |
| `--no-office` | 跳过 Office 文件搜索 |
| `-m, --max-results N` | 最大结果数量（默认 100） |

## 全局安装（可选）

```bash
pnpm add -g textract
```

> .docx/.xlsx/.pptx 无需额外系统依赖，纯 JS 实现。

## 开发

```bash
# 安装依赖
pnpm install

# 打包
pnpm build
```
