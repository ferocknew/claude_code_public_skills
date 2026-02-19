# Excel 通用查询工具

## 🚀 快速开始

### 方法一：直接运行（推荐）⭐

**首次使用需要安装依赖：**

```bash
cd /root/.claude/skills/excel-alasql
npm install alasql xlsx
```

**然后直接运行：**

```bash
# 数据概览
node run.js excel/故障树.xlsx

# 关键词搜索
node run.js excel/故障树.xlsx "中间事件"

# 导出 JSON
node run.js excel/故障树.xlsx "*" > output.json
```

### 方法二：使用 Bash 脚本（Linux/macOS/WSL）

```bash
cd /root/.claude/skills/excel-alasql

# 数据概览
bash run.sh excel/故障树.xlsx

# 关键词搜索
bash run.sh excel/故障树.xlsx "中间事件"

# 导出 JSON
bash run.sh excel/故障树.xlsx "*" > output.json
```

### 方法三：Windows 用户（.bat 脚本）

```cmd
cd C:\path\to\skills\excel-alasql

REM 数据概览
run.bat excel\故障树.xlsx

REM 关键词搜索
run.bat excel\故障树.xlsx "中间事件"

REM 导出 JSON
run.bat excel\故障树.xlsx "*" > output.json
```

---

## 📊 功能说明

| 操作 | 说明 | 示例 |
|------|------|------|
| **无参数** | 显示数据概览 | `bash run.sh data.xlsx` |
| **关键词** | 全文搜索所有列 | `bash run.sh data.xlsx "关键词"` |
| **"*"** | 导出为 JSON | `bash run.sh data.xlsx "*"` |

---

## 🛠️ 工具对比

| 工具 | 平台 | 优点 | 缺点 |
|------|------|------|------|
| `run.sh` | Linux/macOS | 最简单，一行命令 | Windows 需 Git Bash |
| `run.js` | 跨平台 | 纯 Node.js，通用性强 | 命令较长 |
| `run.bat` | Windows | 原生支持 | PowerShell 依赖 |
| `analyze.sh` | Linux/macOS | 详细报告 | 仅概览模式 |

---

## 💡 使用场景

### 场景 1: 快速查看 Excel 内容

```bash
bash run.sh excel/data.xlsx
```

**输出:**
- 总记录数、列数
- 前 3 条数据预览
- 列信息分析

### 场景 2: 搜索特定内容

```bash
bash run.sh excel/故障树.xlsx "MCU"
```

**输出:**
- 所有包含 "MCU" 的记录
- 表格形式展示

### 场景 3: 导出数据进行处理

```bash
# 导出 JSON
bash run.sh excel/data.xlsx "*" > data.json

# 结合 jq 工具处理
bash run.sh excel/data.xlsx "*" | jq '.[] | select(.层级 == "中间事件")'
```

---

## ⚠️ 注意事项

1. **中文支持**
   - ✅ 完全支持中文文件名
   - ✅ 完全支持中文列名
   - ✅ 完全支持中文数据内容

2. **平台兼容性**
   - Linux/macOS: 使用 `run.sh` 或 `run.js`
   - Windows: 使用 `run.bat` 或 `run.js`（需 Git Bash）
   - 跨平台: `run.js` 最通用

3. **依赖安装**
   - **必须先安装依赖**：`npm install alasql xlsx`
   - 依赖已预装到 skill 目录，通常无需手动操作
   - 如果报错 "Cannot find module 'alasql'"，请运行上述安装命令

---

## 🔧 高级用法

对于复杂查询（统计、聚合、多表联查等），请参考：

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

运行（需要先安装依赖）：

```bash
cd /root/.claude/skills/excel-alasql
node my-script.js
```

---

## 📖 常见问题

### Q: Windows 下如何使用？

A: 有三种方式：
1. 使用 Git Bash 运行 `run.sh`
2. 直接使用 `run.bat`
3. 使用 `run.js`（需要 Node.js）

### Q: 如何处理大文件？

A: 对于大于 100MB 的文件，建议：
1. 先导出 JSON，再用 jq/Python 处理
2. 或创建自定义脚本进行分批处理

### Q: 支持 SQL 查询吗？

A: 由于 AlaSQL 不支持中文列名作为 SQL 标识符，暂时只支持关键词搜索。如需复杂查询，请使用 JavaScript 方式筛选。

---

## 📝 版本历史

- **v1.1.0** - 优化依赖管理
  - 依赖预装到 skill 目录
  - 移除 npx 模式（不稳定）
  - 推荐直接使用 `node run.js`

- **v1.0.0** - 初始版本
  - 支持数据概览
  - 支持关键词搜索
  - 支持 JSON 导出
  - 跨平台兼容
