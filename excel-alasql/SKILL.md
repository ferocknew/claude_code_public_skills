---
name: excel-alasql
description: 当用户要求"读取 Excel 文件"、"解析 Excel"、"查询 Excel 数据"、"将 Excel 转换为 JSON"、"使用 SQL 分析 Excel"、"使用 AlaSQL"时，或者需要在 JavaScript/Node.js 环境中使用 SQL 查询处理 Excel 文件（.xlsx、.xls、.csv）时使用此 skill。
version: 3.0.0
skill_version: 260219.123126
---

# 使用 AlaSQL 处理 Excel 文件

本 skill 提供使用 AlaSQL 读取、查询和操作 Excel 文件的完整指南。AlaSQL 是一个纯 JavaScript SQL 数据库,可在浏览器和 Node.js 中直接处理 Excel、CSV 和 JSON 数据。

## 概述

AlaSQL 是一个功能强大的 JavaScript 库,允许直接对 Excel 文件运行 SQL 查询,无需将其导入传统数据库。**特别擅长处理 CSV、JSON 格式和内存中的 SQL 查询**。

## 运行方式

**直接运行，无需安装依赖：**

```bash
# 数据概览
node skill.js <文件路径>

# 关键词搜索
node skill.js <文件路径> "关键词"

# 导出 JSON
node skill.js <文件路径> "*" > output.json

# 快速分析
node skill-analyze.js <文件路径>
```

### 使用方式

```bash
# 数据概览
node skill.js <文件路径>

# 关键词搜索
node skill.js <文件路径> "关键词"

# 导出 JSON
node skill.js <文件路径> "*" > output.json

# 快速分析
node skill-analyze.js <文件路径>
```

---

## 支持的文件格式

### 输入格式（读取）

| 格式 | 说明 | 支持程度 |
|------|------|----------|
| **XLSX** | Excel 2007+ 格式 | ✅ 完全支持 |
| **XLS** | Excel 97-2003 格式 | ✅ 完全支持 |
| **CSV** | 逗号分隔值 | ✅ 完全支持 |
| **JSON** | JavaScript 对象表示法 | ✅ 完全支持 |

详细读取示例: **`examples/reading-formats.js`**

### 输出格式（写入）

| 格式 | 说明 | 支持程度 |
|------|------|----------|
| **XLSX** | Excel 2007+ 格式 | ✅ 完全支持 |
| **CSV** | 逗号分隔值 | ✅ 完全支持 |
| **JSON** | JSON 数组 | ✅ 完全支持 |

详细写入示例: **`examples/writing-formats.js`**

---

## 何时使用 AlaSQL

在以下情况使用 AlaSQL:
- 读取 Excel 文件,无需安装 Microsoft Excel 或数据库服务器
- 对电子表格数据运行 SQL 查询
- 在 Excel、CSV 和 JSON 之间转换格式
- 执行数据转换和聚合操作
- 从数据生成 Excel 报表

---

## 中文文件名

**完全支持中文文件名和中文列名！**

```javascript
const { promise: alasql } = require('alasql');

// 直接读取中文文件名
const data = await alasql(
  'SELECT * FROM XLSX("故障树.xlsx", {autoExt: false})'
);

// 使用中文列名
const filtered = data.filter(row => row['层次'] === '中间事件');
```

**支持情况:**
- ✅ 中文文件名: `故障树.xlsx`
- ✅ 中文列名: `层次`, `事件编号`, `事件名称`
- ✅ 中文数据内容

详细示例: **`examples/chinese-filename.js`**

---

## 基本操作

### 读取 Excel 文件

详细代码: **`examples/quick-start.js`**

```javascript
const { promise: alasql } = require('alasql');

const data = await alasql(
  'SELECT * FROM XLSX("data.xlsx", {autoExt: false})'
);
```

**重要选项:**
- `{autoExt: false}` - 防止自动添加扩展名（必需）
- `{sheetid: "Sheet2"}` - 指定工作表
- `{range: "A1:E100"}` - 指定范围

---

### SQL 查询

详细代码: **`examples/sql-query.js`**

```javascript
// 筛选
const filtered = await alasql(
  'SELECT * FROM ? WHERE amount > 100',
  [data]
);

// 聚合
const summary = await alasql(`
  SELECT category, SUM(amount) as total
  FROM ?
  GROUP BY category
`, [data]);

// 排序
const sorted = await alasql(
  'SELECT * FROM ? ORDER BY date DESC',
  [data]
);
```

---

### 写入 Excel 文件

详细代码: **`examples/write-excel.js`**

```javascript
// 写入 XLSX
await alasql(
  'SELECT * INTO XLSX("output.xlsx") FROM ?',
  [data]
);

// 指定工作表
await alasql(
  'SELECT * INTO XLSX("output.xlsx", {sheetid: "报表"}) FROM ?',
  [data]
);
```

---

## 高级功能

### 数据验证

详细代码: **`examples/data-validation.js`**

### 数据转换

详细代码: **`examples/data-transform.js`**

### 批量处理

详细代码: **`examples/batch-process.js`**

### 内存数据库

详细代码: **`examples/in-memory-db.js`**

---

## 限制与注意事项

### 优势

- ✅ 完全支持中文文件名和列名
- ✅ 跨平台兼容
- ✅ 无需本地安装（使用 npx）
- ✅ 轻量级 SQL 处理

### 限制

- AlaSQL 不能替代生产数据库
- 非常大的文件（>100MB）可能导致内存问题
- 不保留复杂的 Excel 特性（公式、宏、图表）
- SQL 功能集有限（相比 PostgreSQL/MySQL）

---

## 附加资源

### 参考文件
- **`references/functions.md`** - 完整的 AlaSQL 函数参考
- **`references/examples.md`** - 高级用法示例

### 示例文件

**基础示例:**
- **`examples/quick-start.js`** - 快速开始
- **`examples/run.js`** - 测试脚本
- **`examples/reading-formats.js`** - 读取各种格式
- **`examples/writing-formats.js`** - 写入各种格式
- **`examples/sql-query.js`** - SQL 查询示例
- **`examples/chinese-filename.js`** - 中文文件名处理

**高级示例:**
- **`examples/data-validation.js`** - 数据验证
- **`examples/data-transform.js`** - 数据转换
- **`examples/batch-process.js`** - 批量处理
- **`examples/in-memory-db.js`** - 内存数据库

---

## 快速开始

**直接运行，无需安装：**

```bash
node skill.js <文件路径>
```

### 使用示例

#### Linux/macOS/WSL/Git Bash

```bash
node skill.js excel/故障树.xlsx
node skill.js excel/故障树.xlsx "中间事件"
node skill.js excel/故障树.xlsx "*" > output.json
```

#### Windows (CMD/PowerShell)

```cmd
node skill.js excel\故障树.xlsx
node skill.js excel\故障树.xlsx "中间事件"
```

```cmd
cd C:\path\to\skills\excel-alasql

# 数据概览
run.bat excel\故障树.xlsx

# 关键词搜索
run.bat excel\故障树.xlsx "中间事件"
```

---

## 功能说明

| 操作 | 说明 | 示例 |
|------|------|------|
| **无参数** | 显示数据概览 | `skill.js data.xlsx` |
| **关键词** | 全文搜索所有列 | `skill.js data.xlsx "关键词"` |
| **"*"** | 导出为 JSON | `skill.js data.xlsx "*"` |

---

## 完整示例

### Linux/macOS/WSL/Git Bash

```bash
node skill.js excel/故障树.xlsx
```

### Windows (CMD/PowerShell)

```cmd
node skill.js excel\故障树.xlsx
```

**输出内容:**
- 📊 数据概览（总记录数、列数）
- 🔍 前 5 条记录预览
- 📋 列信息分析（非空率、唯一值、值分布）

---

## 方式五：运行示例脚本

**前提：需要先在父目录执行 `pnpm install`**

```bash
cd .claude/skills/excel-alasql/examples

# 快速开始
node quick-start.js

# 测试中文文件名
node chinese-filename.js

# 综合测试
node comprehensive-test.js
```

### 方式六：创建自定义脚本

对于复杂分析需求，可以创建临时脚本：

```javascript
const { promise: alasql } = require('alasql');

const data = await alasql(
  'SELECT * FROM XLSX("故障树.xlsx", {autoExt: false})'
);

// 你的分析逻辑...
console.log(data);
```

运行方式（**前提：需要先 pnpm install**）：
```bash
node script.js
```

---

## 工具文件说明

| 文件 | 说明 |
|------|------|
| **skill.js** | 主工具，包含所有依赖，无需安装 |
| **skill-analyze.js** | 快速分析工具 |

---

## 常见问题

### Q: 首次使用需要做什么？

**A:** 无需任何安装，直接运行 `node skill.js <文件>` 即可！

### Q: 支持复杂 SQL 查询吗？

**A:** 由于 AlaSQL 不支持中文列名作为 SQL 标识符，暂不支持。建议：
1. 使用关键词搜索（全文）
2. 导出 JSON 后用 jq/Python 处理
3. 创建自定义脚本进行 JavaScript 筛选
