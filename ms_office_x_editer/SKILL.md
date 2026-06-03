---
name: ms_office_x_editer
description: 当用户要求"编辑 Word 文档"、"修改 docx 文件"、"编辑 Excel 文件"、"修改 xlsx 文件"、"替换文档中的文本"、"修改表格"、"查看文档信息"、"修改样式"、"设置字体颜色"、"设置加粗"、"读取 Excel"、"写入 Excel"、"修改工作表"、"比较文档差异"、"docx diff"、"文档对比"时使用此 skill。支持 docx 和 xlsx 两种格式。
version: 260529.164052
skill_version: 260529.164052
---

# MS Office 编辑工具

通过直接操作解压后的 Office XML 来编辑 Word（.docx）和 Excel（.xlsx）文件，支持文本、样式、表格、图片、页眉页脚、工作表和元数据的读取与修改。

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

## 对比命令

比较两个 docx 文档的差异，输出 Markdown 格式报告。

| 命令 | 说明 | 示例 |
|------|------|------|
| `diff <new.docx>` | 完整差异报告（Markdown） | `node skill.js old.docx diff new.docx` |
| `diff <new.docx> --summary` | 仅概要统计 | `node skill.js old.docx diff new.docx --summary` |
| `diff <new.docx> -o report.md` | 输出到文件 | `node skill.js old.docx diff new.docx -o report.md` |

### 差异报告内容

- **段落差异**：LCS 对齐 + 相似度配对检测修改，词级 diff 显示具体变化（删除线 ~~旧~~ / **加粗** 新增）
- **表格差异**：逐单元格对比，输出变更位置
- **图片差异**：MD5 哈希对比，检测内容变化
- **页眉页脚**：文本内容对比
- **元数据**：属性值变化对比

### diff 示例

```bash
# 完整差异报告
node skill.js /path/old.docx diff /path/new.docx

# 仅查看概要统计
node skill.js /path/old.docx diff /path/new.docx --summary

# 报告保存到文件
node skill.js /path/old.docx diff /path/new.docx -o /tmp/diff_report.md
```

## 通用选项

| 选项 | 说明 |
|------|------|
| `-o, --output <path>` | 输出路径（默认覆盖原文件，diff 命令输出到指定 md 文件） |
| `-i, --image <path>` | 新图片路径（image-replace 使用） |
| `--regex` | 正则搜索模式 |
| `--dry-run` | 预览修改，不实际执行 |
| `--summary` | 仅输出差异概要（diff 命令使用） |

## 输出格式

统一 JSON 输出：`{"ok": true, "command": "xxx", "data": {...}}`

---

## XLSX 只读命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `xlsx-info` | 工作簿概览 | `node skill.js file.xlsx xlsx-info` |
| `xlsx-sheet-list` | 列出所有工作表 | `node skill.js file.xlsx xlsx-sheet-list` |
| `xlsx-sheet-read <index>` | 读取整个工作表 | `node skill.js file.xlsx xlsx-sheet-read 0` |
| `xlsx-cell-read <sheet> <ref>` | 读取单元格 | `node skill.js file.xlsx xlsx-cell-read 0 A1` |
| `xlsx-range-read <sheet> <range>` | 读取区域 | `node skill.js file.xlsx xlsx-range-read 0 A1:C3` |
| `xlsx-style-read <sheet> <ref>` | 读取单元格样式 | `node skill.js file.xlsx xlsx-style-read 0 A1` |
| `meta-read` | 读取文档属性 | `node skill.js file.xlsx meta-read` |

## XLSX 写入命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `xlsx-cell-write <sheet> <ref> <value>` | 写入单元格 | `node skill.js file.xlsx xlsx-cell-write 0 A1 "Hello"` |
| `xlsx-range-write <sheet> <start> <json>` | 批量写入 | `node skill.js file.xlsx xlsx-range-write 0 A1 '[["Name","Age"]]'` |
| `xlsx-sheet-rename <index> <name>` | 重命名工作表 | `node skill.js file.xlsx xlsx-sheet-rename 0 "数据表"` |
| `xlsx-style-apply <sheet> <ref> '<json>'` | 修改单元格样式 | `node skill.js file.xlsx xlsx-style-apply 0 A1 '{"bold":true}'` |
| `xlsx-cell-merge <sheet> <range>` | 合并单元格 | `node skill.js file.xlsx xlsx-cell-merge 0 A1:D1` |
| `xlsx-cell-unmerge <sheet> <ref>` | 取消合并 | `node skill.js file.xlsx xlsx-cell-unmerge 0 A1` |
| `meta-update` | 修改文档属性 | `node skill.js file.xlsx meta-update '{"dc:title":"新标题"}'` |

## XLSX 样式参数（xlsx-style-apply 使用）

| 参数 | 类型 | 说明 |
|------|------|------|
| `bold` | boolean | 粗体 |
| `italic` | boolean | 斜体 |
| `underline` | string | 下划线类型：`"single"`, `"double"`, `"none"` |
| `strikethrough` | boolean | 删除线 |
| `fontSize` | number | 字号（磅值，12=12pt，14=14pt） |
| `fontFamily` | string | 字体，如 `"Arial"`, `"宋体"` |
| `color` | string | 字体颜色（HEX，不含#），如 `"FF0000"` |
| `backgroundColor` | string | 背景颜色（HEX，不含#），如 `"FFFF00"` |
| `border` | object | 边框设置（见下方说明） |
| `alignment` | object | 对齐设置（见下方说明） |

### 边框参数

简写模式（全边框统一设置）：
```json
{"border": {"style": "thin", "color": "000000"}}
```

详细模式（各边独立设置）：
```json
{"border": {"top": {"style": "thin", "color": "000000"}, "bottom": {"style": "medium"}}}
```

边框样式值：`thin`, `medium`, `thick`, `dotted`, `dashed`, `double`, `hair`, `none`

### 对齐参数

```json
{"alignment": {"horizontal": "center", "vertical": "center", "wrapText": true}}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `horizontal` | string | 水平对齐：`"left"`, `"center"`, `"right"` |
| `vertical` | string | 垂直对齐：`"top"`, `"center"`, `"bottom"` |
| `wrapText` | boolean | 自动换行 |
| `textRotation` | number | 文本旋转角度 |
| `indent` | number | 缩进 |

### XLSX 使用示例

```bash
# 工作簿概览
node skill.js file.xlsx xlsx-info

# 读取第一个工作表的全部数据
node skill.js file.xlsx xlsx-sheet-read 0

# 读取指定单元格
node skill.js file.xlsx xlsx-cell-read 0 B2

# 读取区域
node skill.js file.xlsx xlsx-range-read 0 A1:C5

# 写入单元格
node skill.js file.xlsx xlsx-cell-write 0 A1 "Hello World"
node skill.js file.xlsx xlsx-cell-write 0 B1 100

# 批量写入二维数据
node skill.js file.xlsx xlsx-range-write 0 A1 '[["姓名","年龄"],["张三",25],["李四",30]]'

# 重命名工作表
node skill.js file.xlsx xlsx-sheet-rename 0 "销售数据"

# 修改样式
node skill.js file.xlsx xlsx-style-apply 0 A1 '{"bold":true,"color":"FF0000"}'
node skill.js file.xlsx xlsx-style-apply 0 A1 '{"fontSize":14,"backgroundColor":"FFFF00"}'
node skill.js file.xlsx xlsx-style-apply 0 A1 '{"border":{"style":"thin","color":"000000"}}'
node skill.js file.xlsx xlsx-style-apply 0 A1 '{"alignment":{"horizontal":"center","vertical":"center"}}'
node skill.js file.xlsx xlsx-style-apply 0 A1 '{"bold":true,"fontSize":16,"border":{"style":"thin"},"alignment":{"horizontal":"center"}}'

# 合并/取消合并单元格
node skill.js file.xlsx xlsx-cell-merge 0 A1:D1
node skill.js file.xlsx xlsx-cell-unmerge 0 A1

# 元数据操作（docx/xlsx 通用）
node skill.js file.xlsx meta-read
node skill.js file.xlsx meta-update '{"dc:title":"报表标题"}'
```

## 技术说明

- 使用 JSZip 解压/打包 Office 文件（docx/xlsx 本质都是 ZIP）
- 直接操作 XML 字符串，不依赖 XML 解析库
- docx 文本替换：直接在 `<w:t>` 元素内容上替换，保留原有格式
- docx 样式修改：修改 `<w:rPr>` 中的格式属性
- xlsx 文本存储：通过 `xl/sharedStrings.xml` 索引引用
- xlsx 样式系统：集中式 `xl/styles.xml` + 索引引用
- 括号平衡 XML 提取：替代正则匹配嵌套标签
