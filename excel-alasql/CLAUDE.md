# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 文档说明

本项目包含 3 个核心文档，各自有不同的功能定位：

| 文件 | 功能定位 | 目标读者 |
|------|----------|----------|
| **SKILL.md** | 告诉 LLM 如何使用这个 skill | Claude AI (LLM) |
| **CLAUDE.md** | AI 开发工具的指引，包含项目架构和开发规范 | Claude Code (开发助手) |
| **README.md** | skill 的完整使用说明文档 | 用户 |

---

## 项目概述

这是一个基于 AlaSQL 的 Excel 处理工具，用于读取、查询和转换 Excel 文件（.xlsx, .xls, .csv）。核心特点是通过**列名映射机制**完全支持中文列名的 SQL 查询。

### 核心功能

- 数据概览（含列名映射表显示）
- 关键词全文搜索
- SQL 查询（支持 WHERE/LIKE/ORDER BY/LIMIT）
- 导出 JSON

---

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

# SQL 查询
node run.js <文件路径> "SELECT * WHERE c0 = '值'"

# 导出 JSON
node run.js <文件路径> "*" > output.json
```

### 打包
```bash
# 生成 skill.js 和 skill-analyze.js
node build.js
```

---

## 核心架构

### 主入口文件
- `run.js` - 跨平台主脚本，支持四种操作模式（概览/搜索/SQL/导出）
- `quick-analyze.js` - 快速分析工具

### 列名映射机制

由于 AlaSQL 不支持中文列名作为 SQL 标识符，本工具实现了**列名映射机制**：

```javascript
// 映射函数：将原始列名映射为 c0, c1, c2...
function mapColumns(data) {
  const mapping = {};
  const first = data[0];
  Object.keys(first).forEach((k, i) => {
    mapping["c" + i] = k;
  });
  // ... 返回映射后的数据和映射表
}

// 反映射函数：将查询结果转回原始列名
function unmapColumns(data, mapping) {
  const reverseMapping = {};
  for (const [k, v] of Object.entries(mapping)) {
    reverseMapping[k] = v;
  }
  // ... 返回转换后的数据
}
```

**SQL 查询流程：**
1. 读取 Excel 数据（原始列名）
2. `mapColumns()` 映射为 c0, c1, c2...
3. 执行 SQL 查询（使用 c0, c1...）
4. `unmapColumns()` 转回原始列名
5. 显示结果

### 依赖加载方式
项目同时支持两种依赖加载方式：
1. **npx 模式**（推荐用于测试）：`npx --yes --package=alasql@1.7.3 --package=xlsx node script.js`
2. **本地安装模式**（推荐用于开发）：`npm install` 后直接 `node script.js`

### AlaSQL 使用模式

**读取 Excel（必须使用 {autoExt: false}）：**
```javascript
const data = await alasql('SELECT * FROM XLSX("文件.xlsx", {autoExt: false})');
```

**SQL 查询（使用 ? 参数）：**
```javascript
const result = await alasql('SELECT * FROM ? WHERE c1 > 100', [mappedData]);
```

### 重要限制

1. **仅支持查询**：禁止 UPDATE/DELETE/INSERT/CREATE/DROP/ALTER/TRUNCATE/REPLACE
2. **文件大小**：大于 100MB 的文件可能导致内存问题
3. **Excel 特性**：不保留公式、宏、图表等复杂特性
4. **SQL 功能**：不支持 JOIN、子查询、复杂聚合函数

---

## 开发规范

### 代码风格
1. 使用 async/await 处理 AlaSQL 的 promise 接口
2. 所有文件操作使用 `require("alasql").promise`
3. 始终在 XLSX 函数中添加 `{autoExt: false}` 选项
4. 中文内容无需特殊处理，直接使用即可

### 版本号规则
**打包文件版本号格式：YYMMDD.HHmmSS**
- 由 `build.js` 自动生成并注入到打包文件
- 同时更新 SKILL.md 中的 `skill_version` 字段

### SQL 解析逻辑
```javascript
// 检测 SQL 查询类型
function isSqlQuery(str) {
  const upper = str.trim().toUpperCase();
  return upper.startsWith("SELECT") || upper.startsWith("SHOW");
}

// 检测危险操作（禁止修改）
function isDangerousSql(str) {
  const upper = str.trim().toUpperCase();
  return upper.includes("UPDATE") || upper.includes("DELETE") || ...;
}

// 解析 SQL 并自动添加 FROM ?
if (sql.includes("FROM ?")) {
  result = await alasql(sql, [mappedData]);
} else if (sql.toUpperCase().includes("WHERE")) {
  result = await alasql(sql.replace(/WHERE/i, "FROM ? WHERE"), [mappedData]);
} else if (sql.toUpperCase().includes("ORDER BY")) {
  // ... 类似处理
} else {
  result = await alasql(`${sql} FROM ?`, [mappedData]);
}
```

---

## 示例文件分类

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
- `error-handling.js` - 错误处理
