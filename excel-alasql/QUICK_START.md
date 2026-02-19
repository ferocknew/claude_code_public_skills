# Excel 快速分析工具

## 🚀 快速开始

### 前置准备（首次使用）

```bash
cd /root/.claude/skills/excel-alasql
npm install alasql xlsx
```

> 依赖已预装到 skill 目录，通常无需手动操作。如果报错 "Cannot find module"，请运行上述命令。

---

### 1. 数据概览（最常用）

```bash
node run.js excel/故障树.xlsx
```

**输出:**
- 总记录数、列数
- 前 3 条数据预览
- 列信息分析（非空率、唯一值）

### 2. 关键词搜索

```bash
# 搜索包含"中间事件"的所有记录
node run.js excel/故障树.xlsx "中间事件"

# 搜索包含"MCU"的所有记录
node run.js excel/故障树.xlsx "MCU"
```

### 3. 导出 JSON

```bash
# 导出全部数据为 JSON
node run.js excel/故障树.xlsx "*" > output.json
```

---

## 📊 工具对比

| 工具 | 用途 | 命令 |
|------|------|------|
| **run.js** | 快速查询（推荐） | `node run.js <文件> [关键词/*]` |
| **run.sh** | Bash 包装脚本 | `bash run.sh <文件> [关键词/*]` |
| **analyze.sh** | 详细分析 | `bash analyze.sh <文件>` |

---

## 💡 使用场景

### 场景 1: 快速查看 Excel 内容

```bash
node run.js excel/data.xlsx
```

### 场景 2: 搜索特定内容

```bash
node run.js excel/data.xlsx "关键词"
```

### 场景 3: 导出数据进行处理

```bash
# 导出 JSON
node run.js excel/data.xlsx "*" > data.json

# 结合 jq 工具处理
node run.js excel/data.xlsx "*" | jq '.[] | .列名'
```

---

## ⚠️ 注意事项

1. **中文支持** - 完全支持中文文件名和列名
2. **SQL 限制** - 由于 AlaSQL 不支持中文列名作为 SQL 标识符，暂不支持复杂 SQL 查询
3. **依赖管理** - 必须先安装依赖才能使用

---

## 🔧 高级用法

如需复杂查询（统计、聚合、多表联查等），请参考：

- `examples/sql-query.js` - SQL 查询示例
- `examples/data-transform.js` - 数据转换
- `examples/comprehensive-test.js` - 综合测试

创建自定义脚本：

```javascript
// my-script.js
const { promise: alasql } = require('alasql');

async function main() {
  const data = await alasql(
    'SELECT * FROM XLSX("data.xlsx", {autoExt: false})'
  );

  // 你的分析逻辑...
  const result = data.filter(row => row.列名 === '值');
  console.log(result);
}

main();
```

运行：

```bash
cd /root/.claude/skills/excel-alasql
node my-script.js
```
