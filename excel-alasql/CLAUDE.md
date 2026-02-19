# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 AlaSQL 的 Excel 处理工具，用于读取、查询和转换 Excel 文件（.xlsx, .xls, .csv）。核心特点是完全支持中文文件名和列名，无需本地安装 Excel 即可进行数据操作。

## 常用命令

### 安装依赖
```bash
npm install
```

### 运行主工具
```bash
# 数据概览
node run.js <文件路径>

# 关键词搜索
node run.js <文件路径> "关键词"

# 导出 JSON
node run.js <文件路径> "*" > output.json
```

### 运行示例脚本
```bash
cd examples
node quick-start.js
node sql-query.js
node data-transform.js
```

## 核心架构

### 主入口文件
- `run.js` - 跨平台主脚本，支持三种操作模式（概览/搜索/导出）
- `run.sh` / `run.bat` - 平台特定包装脚本

### 依赖加载方式
项目同时支持两种依赖加载方式：
1. **npx 模式**（推荐用于测试）：`npx --yes --package=alasql --package=xlsx node script.js`
2. **本地安装模式**（推荐用于开发）：`npm install` 后直接 `node script.js`

代码中使用 try-catch 兼容这两种模式：
```javascript
let alasql;
try {
  alasql = require("alasql").promise;
} catch (e) {
  console.error("请使用: npm install alasql xlsx");
  process.exit(1);
}
```

### AlaSQL 使用模式

**读取 Excel（必须使用 {autoExt: false}）：**
```javascript
const data = await alasql('SELECT * FROM XLSX("文件.xlsx", {autoExt: false})');
```

**写入 Excel：**
```javascript
await alasql('SELECT * INTO XLSX("output.xlsx") FROM ?', [data]);
```

**SQL 查询（使用 ? 参数）：**
```javascript
const result = await alasql('SELECT * FROM ? WHERE amount > 100', [data]);
```

### 重要限制

1. **中文列名问题**：AlaSQL 不支持中文列名作为 SQL 标识符，因此：
   - ❌ 不能使用 `SELECT 中文列名 FROM ...`
   - ✅ 使用 JavaScript 方式：`data.filter(row => row['中文列名'] === value)`

2. **文件大小**：大于 100MB 的文件可能导致内存问题

3. **Excel 特性**：不保留公式、宏、图表等复杂特性

### 示例文件分类

**基础示例：**
- `quick-start.js` - 快速开始
- `reading-formats.js` - 读取各种格式
- `writing-formats.js` - 写入各种格式
- `sql-query.js` - SQL 查询示例

**高级示例：**
- `data-transform.js` - 数据转换
- `batch-process.js` - 批量处理
- `data-validation.js` - 数据验证
- `in-memory-db.js` - 内存数据库

**特殊场景：**
- `chinese-filename.js` - 中文文件名处理
- `test-chinese.js` - 中文内容测试
- `error-handling.js` - 错误处理

## 代码规范

1. 使用 async/await 处理 AlaSQL 的 promise 接口
2. 所有文件操作使用 `require("alasql").promise`
3. 始终在 XLSX 函数中添加 `{autoExt: false}` 选项
4. 中文内容无需特殊处理，直接使用即可
