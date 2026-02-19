# Excel 通用查询工具

基于 AlaSQL 的 Excel 处理工具，支持读取、查询和转换 Excel 文件（.xlsx, .xls, .csv）。完全支持中文文件名和列名。

## 快速开始

**直接运行，无需安装依赖：**

```bash
node skill.js <文件路径>
```

### 使用示例

```bash
# 数据概览
node skill.js data.xlsx

# 关键词搜索
node skill.js data.xlsx "关键词"

# 导出 JSON
node skill.js data.xlsx "*" > output.json

# 快速分析
node skill-analyze.js data.xlsx
```

---

## 功能说明

| 操作 | 说明 | 示例 |
|------|------|------|
| **无参数** | 显示数据概览 | `skill.js data.xlsx` |
| **关键词** | 全文搜索所有列 | `skill.js data.xlsx "关键词"` |
| **"*"** | 导出为 JSON | `skill.js data.xlsx "*"` |

---

## 开发者说明

### 重新打包

**1. 安装依赖：**

```bash
npm install -g pnpm
pnpm install
```

**2. 运行打包脚本：**

```bash
node build.js
# 或
pnpm build
```

**3. 打包输出：**

- `run.js` -> `skill.js` (主工具)
- `quick-analyze.js` -> `skill-analyze.js` (分析工具)

### 源文件

| 文件 | 说明 |
|------|------|
| `run.js` | 主工具源文件 |
| `quick-analyze.js` | 快速分析工具源文件 |
| `build.js` | 打包脚本 |

---

## 注意事项

1. **中文支持**
   - ✅ 完全支持中文文件名
   - ✅ 完全支持中文列名
   - ✅ 完全支持中文数据内容

2. **平台兼容性**
   - Windows / macOS / Linux 通用
   - 依赖已打包，无需安装

3. **文件大小**
   - 建议文件大小 < 100MB
   - 大文件建议导出 JSON 后用其他工具处理

---

## 常见问题

### Q: Windows 下如何使用？

A: 直接运行 `node skill.js <文件>` 即可，与 macOS/Linux 相同。

### Q: 如何处理大文件？

A: 对于大于 100MB 的文件，建议：
1. 先导出 JSON，再用 jq/Python 处理
2. 或创建自定义脚本进行分批处理

### Q: 支持 SQL 查询吗？

A: 由于 AlaSQL 不支持中文列名作为 SQL 标识符，暂时只支持关键词搜索。如需复杂查询，请使用 JavaScript 方式筛选。
