# Excel 通用查询工具

基于 AlaSQL 的 Excel 处理工具，支持读取、查询和转换 Excel 文件（.xlsx, .xls, .csv）。通过**列名映射机制**完全支持中文列名的 SQL 查询。

## 文档说明

| 文件 | 功能定位 | 说明 |
|------|----------|------|
| **SKILL.md** | LLM 使用指南 | 告诉 Claude AI (LLM) 如何使用这个 skill |
| **CLAUDE.md** | 开发者指南 | 给 Claude Code (开发助手) 的项目架构和开发规范 |
| **README.md** | 用户文档 | 完整的使用说明和功能介绍 |

---

## 核心功能

| 功能 | 说明 | 命令示例 |
|------|------|----------|
| **数据概览** | 显示数据统计、列名映射表、前 N 条记录 | `skill.js D:/data/data.xlsx` |
| **关键词搜索** | 全文搜索所有列 | `skill.js D:/data/data.xlsx "关键词"` |
| **SQL 查询** | 支持 WHERE/LIKE/ORDER BY/LIMIT | `skill.js D:/data/data.xlsx "SELECT * WHERE c1 > 100"` |
| **导出 JSON** | 导出全部数据为 JSON | `skill.js D:/data/data.xlsx "*" > output.json` |

---

## 快速开始

**直接运行，无需安装依赖：**

```bash
node skill.js <文件绝对路径>
```

**重要：** 请使用文件的**绝对路径**，例如：
- Windows: `D:\data\文件.xlsx` 或 `D:/data/文件.xlsx`
- macOS/Linux: `/home/user/data/文件.xlsx`

### 使用示例

```bash
# 数据概览（显示列名映射表）
node skill.js D:/data/data.xlsx

# 关键词搜索
node skill.js D:/data/data.xlsx "关键词"

# SQL 查询
node skill.js D:/data/data.xlsx "SELECT * WHERE c0 = '中间事件'"
node skill.js D:/data/data.xlsx "SELECT * WHERE c2 LIKE '%电源%' AND c0 = '中间事件'"
node skill.js D:/data/data.xlsx "SELECT * ORDER BY c1 DESC LIMIT 5"

# 导出 JSON
node skill.js D:/data/data.xlsx "*" > output.json
```

---

## SQL 查询功能

### 表名和列名映射

由于 AlaSQL 不支持中文标识符，本工具使用映射机制：

**表名映射（Sheet -> 字母表名）：**
```
a = 第 1 个 Sheet
b = 第 2 个 Sheet
c = 第 3 个 Sheet
...以此类推
```

**列名映射（原始列名 -> c0, c1, c2...）：**
```
层次 -> c0
事件编号 -> c1
事件名称 -> c2
逻辑门类型 -> c3
```

**重要：** 数据概览模式会自动显示所有 Sheet 名称和列名映射表。

### 支持的 SQL 语法

| 语法 | 示例 |
|------|------|
| WHERE 条件 | `SELECT * FROM a WHERE c0 = '值'` |
| LIKE 模糊查询 | `SELECT * FROM a WHERE c2 LIKE '%关键词%'` |
| AND 多条件 | `SELECT * FROM a WHERE c0 = 'A' AND c1 > 10` |
| OR 多条件 | `SELECT * FROM a WHERE c2 LIKE '%A%' OR c2 LIKE '%B%'` |
| 选择列 | `SELECT c0, c1 FROM a WHERE c3 = '值'` |
| ORDER BY | `SELECT * FROM a ORDER BY c1 DESC` |
| LIMIT | `SELECT * FROM a WHERE c0 = '值' LIMIT 10` |
| JOIN 联合查询 | `SELECT a.c0, b.c0 FROM a JOIN b ON a.c1 = b.c1 LIMIT 5` |
| 组合查询 | `SELECT * FROM a WHERE c0 = 'A' AND c2 LIKE '%关键词%' ORDER BY c1 LIMIT 5` |

**完整命令示例：**
```bash
node skill.js D:/data/data.xlsx "SELECT * FROM a WHERE c0 = '中间事件'"
```

### SQL 限制

- **仅支持 SELECT 查询**，禁止任何修改操作（UPDATE/DELETE/INSERT/CREATE/DROP）
- 聚合函数（COUNT/SUM/AVG）支持有限
- 支持 JOIN 多表联合查询
- 不支持子查询等复杂语法
- **建议使用 LIMIT 限制结果数量**，防止大文件数据溢出

### 使用限制

- ❌ **不建议使用**：文件大小超过 100MB 或数据行数超过 5 万行
- ✅ **推荐使用**：常规 Excel 文件（< 100MB，< 5 万行），可胜任大部分数据分析任务

---

## 版本号规则

**打包文件版本号格式：YYMMDD.HHmmSS**

- `YY`: 年份后两位（如 26 = 2026年）
- `MM`: 月份（01-12）
- `DD`: 日期（01-31）
- `HH`: 小时（00-23）
- `mm`: 分钟（00-59）
- `ss`: 秒（00-59）

版本号会自动添加到：
1. 打包文件（`skill.js`, `skill-analyze.js`）顶部注释
2. 运行时版本信息显示（`-v` / `--version` 参数）
3. `SKILL.md` 中的 `skill_version` 字段

---

## 开发说明

### 安装依赖

```bash
npm install -g pnpm
pnpm install
```

### 重新打包

```bash
node build.js
# 或
pnpm build
```

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
   - ✅ 完全支持中文列名（通过列名映射）
   - ✅ 完全支持中文数据内容

2. **平台兼容性**
   - Windows / macOS / Linux 通用
   - 依赖已打包，无需安装

3. **文件大小限制**
   - ✅ 推荐：文件大小 < 100MB 且数据行数 < 5 万行
   - ❌ 不建议：文件大小超过 100MB 或数据行数超过 5 万行
   - 超大文件建议导出 JSON 后用其他工具处理

---

## 常见问题

### Q: 如何知道列名映射关系？

运行数据概览模式会显示映射表：
```bash
node skill.js D:/data/data.xlsx
# 输出包含：
# 层次 -> c0
# 事件编号 -> c1
```

### Q: 支持数据修改吗？

不支持。本工具仅用于数据查询分析。如需数据处理，请：
1. 使用 `*` 导出 JSON 后用其他工具处理
2. 或创建自定义脚本进行 JavaScript 处理

### Q: Windows 下如何使用？

直接运行 `node skill.js <文件>` 即可，与 macOS/Linux 相同。
