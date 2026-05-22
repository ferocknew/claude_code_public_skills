# CLAUDE.md — docx_editer

## 架构

单文件 `run.js`（~1200 行），通过 JSZip 操作 docx（ZIP 格式），直接处理 XML 字符串。

## 核心模块

| 模块 | 职责 |
|------|------|
| DocxZip | ZIP 加载/保存/文件读写 |
| XmlTextOps | 段落文本提取、跨 run 搜索/替换 |
| XmlTableOps | 表格列表、读取、单元格修改 |
| ImageOps | 图片列表、导出、替换 |
| HeaderFooterOps | 页眉页脚读取/替换 |
| MetaOps | 元数据读取/修改 |

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
cd docx_editer
pnpm install
npm run build
node skill.js demo/SHFY-WPS-SS-9086-1.docx info
```
