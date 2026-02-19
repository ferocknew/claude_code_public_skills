#!/usr/bin/env -S npx -y -p alasql@1.7.3 -p xlsx node
/**
 * Excel 通用查询工具（跨平台版本）
 *
 * 用法:
 *   1. 首次使用需要安装依赖: pnpm install
 *   2. 然后运行: node run.js <文件路径> [操作]
 *
 *   Windows 用户也可以使用: run.bat <文件路径> [操作]
 *
 * 参数:
 *   文件路径   Excel 文件路径（必需）
 *   操作       可选操作（见下方）
 *
 * 操作类型:
 *   (无参数)   显示数据概览
 *   "关键词"   全文搜索（在所有列中查找包含关键词的记录）
 *   "*"        导出全部数据为 JSON
 *
 * 示例:
 *   node run.js excel/故障树.xlsx              # 数据概览
 *   node run.js excel/故障树.xlsx "中间事件"   # 关键词搜索
 *   node run.js excel/故障树.xlsx "*" > output.json  # 导出 JSON
 *
 * 作者: Claude Code
 * 版本: 1.2.0
 */

const fs = require("fs");
const path = require("path");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.2.0-dev";

// 加载 alasql（需要先执行 pnpm install）
let alasql;
try {
  alasql = require("alasql").promise;
} catch (e) {
  console.error("错误: 无法加载 alasql 模块");
  console.error("");
  console.error("请先在 skills 目录下执行: pnpm install");
  console.error("");
  console.error("Windows 用户也可以使用: run.bat <文件路径>");
  process.exit(1);
}

// 解析命令行参数
const excelFile = process.argv[2];
const operation = process.argv[3];

// 显示帮助
function showHelp() {
  console.log(`
Excel 通用查询工具 v${SKILL_VERSION}

用法:
  node skill.js <文件路径> [操作]

参数:
  文件路径   Excel 文件路径（必需）
  操作       可选操作（见下方）

操作类型:
  (无参数)   显示数据概览
  "关键词"   全文搜索（在所有列中查找包含关键词的记录）
  "*"        导出全部数据为 JSON

示例:
  # 数据概览
  node skill.js data.xlsx

  # 关键词搜索
  node skill.js data.xlsx "关键词"

  # 导出 JSON
  node skill.js data.xlsx "*" > output.json

快捷选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息

提示:
  - 支持中文文件名和列名
  - 无需安装依赖
`);
}

// 显示版本
function showVersion() {
  console.log(`Excel 通用查询工具 v${SKILL_VERSION}`);
  console.log("基于 AlaSQL + SheetJS");
  console.log("跨平台支持: Windows, macOS, Linux");
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

console.log("\n" + "=".repeat(70));
console.log("📊 Excel 数据查询");
console.log("=".repeat(70));
console.log(`\n文件: ${excelFile}\n`);

(async () => {
  try {
    // 读取 Excel 文件
    const data = await alasql(
      `SELECT * FROM XLSX("${excelFile}", {autoExt: false})`
    );

    if (!data || data.length === 0) {
      console.log("⚠️  文件为空或无法读取");
      return;
    }

    // === 模式 1: 导出 JSON ===
    if (operation === "*") {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // === 模式 2: 关键词搜索 ===
    if (operation) {
      console.log(`🔍 筛选结果: "${operation}"`);
      console.log("=".repeat(70));
      console.log(`文件: ${excelFile}\n`);

      // 全文搜索关键词
      const filtered = data.filter((row) =>
        Object.values(row).some((val) => String(val).includes(operation))
      );

      if (filtered.length > 0) {
        console.log(`✓ 找到 ${filtered.length} 条匹配记录\n`);

        // 使用 console.table 美化输出
        if (filtered.length <= 50) {
          console.table(filtered);
        } else {
          console.log(`\n前 20 条:\n`);
          console.table(filtered.slice(0, 20));
          console.log(`\n... 还有 ${filtered.length - 20} 条记录\n`);
        }
      } else {
        console.log("⚠️  未找到匹配记录");
      }
      return;
    }

    // === 模式 3: 数据概览（默认） ===
    console.log(`📈 总记录数: ${data.length}`);
    console.log(`📋 列数: ${Object.keys(data[0]).length}`);
    console.log(`📋 列名: ${Object.keys(data[0]).join(", ")}\n`);

    // 显示前几条记录
    console.log("🔍 数据预览（前 3 条）:\n");
    data.slice(0, 3).forEach((row, i) => {
      console.log(`[${i + 1}]`);
      Object.entries(row).forEach(([key, val]) => {
        const strVal = String(val || "");
        const display = strVal.length > 40 ? strVal.substring(0, 40) + "..." : strVal;
        console.log(`  ${key}: ${display}`);
      });
      console.log("");
    });

    // 列信息分析
    console.log("📊 列信息分析:\n");
    Object.keys(data[0]).forEach((col, idx) => {
      const nonNull = data.filter(
        (row) => row[col] !== null && row[col] !== undefined && row[col] !== ""
      );
      const uniqueValues = [...new Set(nonNull.map((row) => String(row[col])))];

      console.log(`${idx + 1}. ${col}`);
      console.log(`   非空: ${nonNull.length}/${data.length} (${((nonNull.length / data.length) * 100).toFixed(1)}%)`);
      console.log(`   唯一值: ${uniqueValues.length} 个`);

      if (uniqueValues.length <= 8) {
        console.log(`   值: ${uniqueValues.join(", ")}`);
      }
    });

    // 使用示例
    console.log("\n" + "─".repeat(70));
    console.log("\n💡 使用示例:\n");
    console.log(`  npx --yes --package=alasql --package=xlsx node run.js ${excelFile} "关键词"`);
    console.log(`  npx --yes --package=alasql --package=xlsx node run.js ${excelFile} "*" > output.json`);
  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);

    if (error.message.includes("find XLSX") || error.message.includes("format")) {
      console.error("\n💡 提示: 请确保文件格式正确（.xlsx 或 .xls）");
    }

    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ 完成！");
  console.log("=".repeat(70) + "\n");
})();
