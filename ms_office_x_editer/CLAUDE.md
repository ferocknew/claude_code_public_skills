# CLAUDE.md — ms_office_x_editer

## 架构

通过 JSZip 操作 Office 文件（ZIP 格式），直接处理 XML 字符串。入口 `run.js` 根据文件扩展名分流到 docx/xlsx 处理逻辑。

## 核心模块

### docx 模块

| 模块 | 职责 |
|------|------|
| DocxZip | ZIP 加载/保存/文件读写（docx/xlsx 共用） |
| cli.js | docx 命令分发与实现 |
| XmlTextOps | 段落文本提取、跨 run 搜索/替换 |
| XmlTableOps | 表格列表、读取、单元格修改 |
| ImageOps | 图片列表、导出、替换 |
| HeaderFooterOps | 页眉页脚读取/替换 |
| MetaOps | 元数据读取/修改（docx/xlsx 共用） |
| StyleOps | docx 文本样式修改 |
| DiffOps | 文档差异算法（LCS 对齐、词级 diff） |
| DiffMd | 差异报告 Markdown 格式化 |

### xlsx 模块

| 模块 | 职责 |
|------|------|
| xlsx_cli.js | xlsx 命令分发与实现 |
| xlsx_utils.js | 坐标转换、sharedStrings 解析/构建、XML 属性操作 |
| sheet_ops.js | 工作表操作（列表、读写、重命名） |
| xlsx_style_ops.js | xlsx 样式读取/应用 |

## xlsx 关键设计

### sharedStrings 机制
xlsx 文本单元格 `t="s"` 的 `<v>` 存的是 sharedStrings 索引：
- 读：解析 `<si><t>文本</t></si>` 建索引→文本映射
- 写：新文本追加到 sharedStrings，更新 `count`/`uniqueCount`
- 文件可能不存在（空工作簿），首次写入时创建

### 单元格坐标转换
`A1 → {col:0, row:0}`，列字母支持多字母（AA=26, AB=27...）

### 集中式样式系统
`<c s="0">` 的 `s` 引用 `cellXfs[0]`，`<xf fontId fillId borderId>` 组合子样式。
修改样式：找或创建匹配的 `<xf>`，更新单元格的 `s` 属性。

## 关键算法

### 跨 Run 文本替换
docx 中的文本可能被拆分到多个 `<w:r>` 元素。策略：
1. 在每个 `<w:p>` 内拼接所有 `<w:t>` 得到完整文本
2. 在完整文本上搜索匹配位置
3. 从后往前替换，保持第一个 run 的格式属性

### 括号平衡 XML 提取
用 `indexOf` + 深度计数提取 XML 块，替代不可靠的正则匹配嵌套标签。

## 开发命令

```bash
cd ms_office_x_editer
pnpm install
npm run build
# docx
node skill.js demo/SHFY-WPS-SS-9086-1.docx info
# xlsx
node skill.js demo/工作簿1.xlsx xlsx-info
```
