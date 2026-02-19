#!/usr/bin/env -S npx -y -p alasql@1.7.3 -p xlsx node
/**
 * Excel 通用查询工具（跨平台版本）
 *
 * 用法:
 *   node skill.js <文件绝对路径> [SQL语句]
 *
 * 作者: Claude Code
 * 版本: 2.0.0
 */

const fs = require("fs");
const XLSX = require("xlsx");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "2.0.0-dev";

// 加载 alasql
const alasql = require("alasql");

// 解析命令行参数
const excelFile = process.argv[2];
const sqlQuery = process.argv[3];

// 显示帮助
function showHelp() {
  console.log(`
Excel 通用查询工具 v${SKILL_VERSION}

用法:
  node skill.js <文件绝对路径> [SQL语句]

参数:
  文件绝对路径   Excel 文件的绝对路径（必需）
  SQL语句        可选的 SQL 查询语句（不指定则显示数据概览）

示例:
  # 数据概览（显示所有 Sheet 和列名映射）
  node skill.js D:/data/data.xlsx

  # 简单查询
  node skill.js D:/data/data.xlsx "SELECT * FROM a WHERE c0 = '中间事件'"

  # 模糊查询
  node skill.js D:/data/data.xlsx "SELECT * FROM a WHERE c2 LIKE '%电源%'"

  # JOIN 查询（多 Sheet）
  node skill.js D:/data/data.xlsx "SELECT a.c0, b.c0 FROM a JOIN b ON a.c1 = b.c1"

  # 带 LIMIT 限制结果数量
  node skill.js D:/data/data.xlsx "SELECT * FROM a LIMIT 10"

表名说明:
  - a: 第 1 个 Sheet
  - b: 第 2 个 Sheet
  - c: 第 3 个 Sheet
  - 以此类推...

列名说明:
  - c0: 第 1 列
  - c1: 第 2 列
  - c2: 第 3 列
  - 以此类推...

快捷选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息
`);
}

// 显示版本
function showVersion() {
  console.log(`Excel 通用查询工具 v${SKILL_VERSION}`);
  console.log("基于 AlaSQL + SheetJS");
}

if (!excelFile || excelFile === "-h" || excelFile === "--help") {
  showHelp();
  process.exit(0);
}

if (excelFile === "-v" || excelFile === "--version") {
  showVersion();
  process.exit(0);
}

// 检查文件是否存在
if (!fs.existsSync(excelFile)) {
  console.error(`错误: 文件不存在 - ${excelFile}`);
  process.exit(1);
}

// 危险操作检测
function isDangerousSql(sql) {
  const upper = sql.toUpperCase();
  return upper.includes("UPDATE") ||
         upper.includes("DELETE") ||
         upper.includes("INSERT") ||
         upper.includes("DROP") ||
         upper.includes("CREATE") ||
         upper.includes("ALTER") ||
         upper.includes("TRUNCATE") ||
         upper.includes("REPLACE");
}

console.log("\n" + "=".repeat(70));
console.log("📊 Excel 数据查询");
console.log("=".repeat(70));
console.log(`\n文件: ${excelFile}\n`);

// 读取 Excel 文件
const workbook = XLSX.readFile(excelFile);
const sheetNames = workbook.SheetNames;

console.log(`📊 检测到 ${sheetNames.length} 个 Sheet:`);
sheetNames.forEach((name, i) => {
  const tableName = String.fromCharCode(97 + i); // a, b, c...
  console.log(`  ${tableName} = "${name}"`);
});

// 将每个 Sheet 注册为 AlaSQL 表（使用 a, b, c... 作为表名）
const columnMappings = {}; // 存储每个表的列名映射

sheetNames.forEach((sheetName, idx) => {
  const tableName = String.fromCharCode(97 + idx); // a, b, c...
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: null });

  // 转换列名为 c0, c1, c2... 格式
  const mapping = {};
  const mappedData = json.map(row => {
    const r = {};
    Object.keys(row).forEach((k, i) => {
      const colKey = "c" + i;
      r[colKey] = row[k];
      mapping[colKey] = k; // 保存映射关系
    });
    return r;
  });

  columnMappings[tableName] = mapping;

  // 注册为 AlaSQL 表（使用映射后的数据）
  alasql.tables[tableName] = { data: mappedData };

  console.log(`  ✓ ${tableName} ("${sheetName}"): ${json.length} 条记录`);
});

// 显示列名映射
console.log("\n📋 列名映射:");
sheetNames.forEach((sheetName, idx) => {
  const tableName = String.fromCharCode(97 + idx);
  const mapping = columnMappings[tableName];
  if (mapping) {
    console.log(`\n  ${tableName} ("${sheetName}"):`);
    Object.entries(mapping).forEach(([sqlCol, originCol]) => {
      console.log(`    ${originCol} -> ${sqlCol}`);
    });
  }
});

// 如果没有 SQL 查询，显示数据概览后退出
if (!sqlQuery) {
  console.log("\n" + "─".repeat(70));
  console.log("\n💡 SQL 查询示例:\n");
  console.log(`  node skill.js ${excelFile} "SELECT * FROM a LIMIT 5"`);
  console.log(`  node skill.js ${excelFile} "SELECT * FROM a WHERE c0 = '中间事件'"`);
  console.log(`  node skill.js ${excelFile} "SELECT * FROM a WHERE c2 LIKE '%电源%'"`);
  console.log(`  node skill.js ${excelFile} "SELECT a.c0, b.c0 FROM a JOIN b ON a.c1 = b.c1"`);
  console.log("\n" + "=".repeat(70));
  process.exit(0);
}

// 执行 SQL 查询
console.log("\n" + "=".repeat(70));
console.log(`🔍 SQL 查询: "${sqlQuery}"`);
console.log("=".repeat(70) + "\n");

// 安全检查
if (isDangerousSql(sqlQuery)) {
  console.error("❌ 数据安全保护");
  console.error("\n此工具仅支持数据查询，不提供任何修改功能！");
  console.error("\n禁止的操作: UPDATE, DELETE, INSERT, DROP, CREATE, ALTER, TRUNCATE, REPLACE");
  process.exit(1);
}

try {
  const result = alasql(sqlQuery);

  // 转换列名（如果结果来自单个表）
  let finalResult = result;
  if (Array.isArray(result) && result.length > 0) {
    // 尝试检测结果来自哪个表
    const firstRowKeys = Object.keys(result[0]);

    // 如果所有列都是 c0, c1, c2... 格式，说明是单表查询
    if (firstRowKeys.every(k => /^c\d+$/.test(k))) {
      // 找到对应的映射表
      const mapping = columnMappings['a']; // 默认使用第一个表的映射
      if (mapping) {
        finalResult = result.map(row => {
          const r = {};
          for (const [k, v] of Object.entries(row)) {
            r[mapping[k] || k] = v;
          }
          return r;
        });
      }
    }
  }

  console.log(`✓ 查询结果: ${finalResult.length} 条记录\n`);

  if (finalResult.length <= 50) {
    console.table(finalResult);
  } else {
    console.log(`\n前 20 条:\n`);
    console.table(finalResult.slice(0, 20));
    console.log(`\n... 还有 ${finalResult.length - 20} 条记录\n`);
  }

} catch (err) {
  console.error(`❌ SQL 查询错误: ${err.message}`);
  console.log("\n💡 提示:");
  console.log("  - 表名使用 a, b, c... 代表第 1, 2, 3... 个 Sheet");
  console.log("  - 列名使用 c0, c1, c2... 代表第 1, 2, 3... 列");
  console.log("  - 使用 LIMIT 限制结果数量，避免数据溢出");
  console.log("\n示例:");
  console.log("  SELECT * FROM a WHERE c0 = '值' LIMIT 10");
  console.log("  SELECT a.c0, b.c0 FROM a JOIN b ON a.c1 = b.c1 LIMIT 5");
  process.exit(1);
}

console.log("\n" + "=".repeat(70));
console.log("✅ 完成！");
console.log("=".repeat(70) + "\n");
