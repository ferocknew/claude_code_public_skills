---
name: docx_editer
description: 当用户要求"编辑 Word 文档"、"修改 docx 文件"、"替换 Word 文档中的文本"、"修改 Word 表格"、"替换 Word 图片"、"修改页眉页脚"、"查看 Word 文档信息"、"修改 Word 样式"、"设置字体颜色"、"设置加粗"时使用此 skill。支持文本搜索/替换、样式修改、表格读取/修改、图片替换、页眉页脚修改、元数据操作等。
version: 260522.131857
skill_version: 260522.131857
---

# DOCX 编辑工具

通过直接操作解压后的 docx XML 来编辑 Word 文件，支持文本、样式、表格、图片、页眉页脚和元数据的读取与修改。

## 运行方式

**直接运行，无需安装依赖：**

```bash
node skill.js <file> <command> [JSON-input] [options]
```

**重要：** 请使用文件的**绝对路径**。

---

## 只读命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `info` | 文档结构概览 | `node skill.js doc.docx info` |
| `text-read` | 读取全部文本 | `node skill.js doc.docx text-read` |
| `text-find <query>` | 搜索文本 | `node skill.js doc.docx text-find "关键词"` |
| `table-list` | 列出所有表格 | `node skill.js doc.docx table-list` |
| `table-read <index>` | 读取指定表格 | `node skill.js doc.docx table-read 0` |
| `image-list` | 列出所有图片 | `node skill.js doc.docx image-list` |
| `image-extract <name>` | 导出图片 | `node skill.js doc.docx image-extract image1.png` |
| `header-read [index]` | 读取页眉 | `node skill.js doc.docx header-read` |
| `footer-read [index]` | 读取页脚 | `node skill.js doc.docx footer-read` |
| `meta-read` | 读取文档属性 | `node skill.js doc.docx meta-read` |
| `style-read <query>` | 查看文本样式 | `node skill.js doc.docx style-read "标题"` |

## 写入命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `text-replace` | 文本替换 | `node skill.js doc.docx text-replace '{"find":"旧","replace":"新"}'` |
| `table-update <index>` | 修改表格单元格 | `node skill.js doc.docx table-update 0 '{"row":0,"col":1,"text":"新值"}'` |
| `image-replace <name>` | 替换图片 | `node skill.js doc.docx image-replace image1.png -i new.png` |
| `header-replace <index>` | 替换页眉文本 | `node skill.js doc.docx header-replace 0 '{"find":"旧","replace":"新"}'` |
| `footer-replace <index>` | 替换页脚文本 | `node skill.js doc.docx footer-replace 0 '{"find":"旧","replace":"新"}'` |
| `meta-update` | 修改文档属性 | `node skill.js doc.docx meta-update '{"title":"新标题"}'` |
| `style-apply` | 修改文本样式 | `node skill.js doc.docx style-apply '{"find":"标题","bold":true,"color":"FF0000"}'` |

## 样式参数（style-apply 使用）

| 参数 | 类型 | 说明 |
|------|------|------|
| `bold` | boolean | 粗体 |
| `italic` | boolean | 斜体 |
| `underline` | string | 下划线类型：`"single"`, `"double"`, `"none"` |
| `strikethrough` | boolean | 删除线 |
| `fontSize` | number | 字号（半磅值，24=12pt，28=14pt） |
| `fontFamily` | string 或 object | 字体，如 `"Arial"` 或 `{"ascii":"Arial","eastAsia":"宋体"}` |
| `color` | string | 字体颜色（HEX，不含#），如 `"FF0000"` |
| `highlight` | string | 高亮颜色，如 `"yellow"`, `"green"`, `"red"` |

### 样式修改示例

```bash
# 加粗+红色
node skill.js doc.docx style-apply '{"find":"焊接","bold":true,"color":"FF0000"}'

# 改字体+字号
node skill.js doc.docx style-apply '{"find":"标题","fontSize":32,"fontFamily":"黑体"}'

# 添加黄色高亮
node skill.js doc.docx style-apply '{"find":"重要","highlight":"yellow"}'

# 下划线+斜体
node skill.js doc.docx style-apply '{"find":"备注","underline":"single","italic":true}'

# 中英文字体分别设置
node skill.js doc.docx style-apply '{"find":"标题","fontFamily":{"ascii":"Arial","eastAsia":"宋体"}}'
```

## 通用选项

| 选项 | 说明 |
|------|------|
| `-o, --output <path>` | 输出路径（默认覆盖原文件） |
| `-i, --image <path>` | 新图片路径（image-replace 使用） |
| `--regex` | 正则搜索模式 |
| `--dry-run` | 预览修改，不实际执行 |

## 输出格式

统一 JSON 输出：`{"ok": true, "command": "xxx", "data": {...}}`

## 技术说明

- 使用 JSZip 解压/打包 docx（docx 本质是 ZIP）
- 直接操作 XML 字符串，不依赖 XML 解析库
- 文本替换：直接在 `<w:t>` 元素内容上替换，保留原有格式
- 样式修改：修改 `<w:rPr>` 中的格式属性
- 括号平衡 XML 提取：替代正则匹配嵌套标签
