/**
 * Excel 快速分析工具（单文件版本）
 *
 * 用法:
 *   1. 首次使用需要安装依赖: npm install（或 pnpm install）
 *   2. 运行: node quick-analyze.js <文件路径>
 *
 * 示例:
 *   node quick-analyze.js excel/故障树.xlsx
 */

const { promise: alasql } = require("alasql");
const path = require("path");

const excelFile = process.argv[2];

if (!excelFile) {
  console.error("Excel 快速分析工具 v1.0.0");
  console.error("");
  console.error("用法: node quick-analyze.js <Excel文件路径>");
  console.error("");
  console.error("首次使用需要先在 skills 目录下执行: pnpm install");
  console.error("");
  console.error("示例:");
  console.error("  node quick-analyze.js excel/故障树.xlsx");
  process.exit(1);
}

// 加载 alasql（需要先执行 pnpm install）
try {
  require("alasql");
} catch (e) {
  console.error("错误: 无法加载 alasql 模块");
  console.error("");
  console.error("请先在 skills 目录下执行: pnpm install");
  process.exit(1);
}

console.log("\n" + "=".repeat(70));
console.log("📊 Excel 数据快速分析");
console.log("=".repeat(70));
console.log(`\n文件: ${excelFile}\n`);

(async () => {
  try {
    // 读取数据
    const data = await alasql(
      `SELECT * FROM XLSX("${excelFile}", {autoExt: false})`
    );

    if (!data || data.length === 0) {
      console.log("⚠️  文件为空或无法读取");
      return;
    }

    // 基本信息
    console.log(`📈 总记录数: ${data.length}`);
    console.log(`📋 列名: ${Object.keys(data[0]).join(', ')}\n`);

    // 数据预览
    console.log("🔍 数据预览（前 5 条）:\n");
    console.table(data.slice(0, 5));

    // 列信息分析
    console.log("\n📊 列信息分析:\n");
    Object.keys(data[0]).forEach((col, idx) => {
      const nonNull = data.filter(row =>
        row[col] !== null && row[col] !== undefined && row[col] !== ''
      );
      const uniqueValues = [...new Set(nonNull.map(row => String(row[col])))];

      console.log(`${idx + 1}. ${col}`);
      console.log(`   非空: ${nonNull.length}/${data.length} (${((nonNull.length/data.length)*100).toFixed(1)}%)`);
      console.log(`   唯一值: ${uniqueValues.length} 个`);

      if (uniqueValues.length <= 10) {
        console.log(`   值: ${uniqueValues.join(', ')}`);
      } else {
        const sample = uniqueValues.slice(0, 5);
        console.log(`   示例: ${sample.join(', ')}... (+${uniqueValues.length - 5} 个)`);
      }
      console.log("");
    });

    // 数据类型分析
    console.log("\n🔬 数据类型分布:\n");
    Object.keys(data[0]).forEach(col => {
      const numericCount = data.filter(row => !isNaN(parseFloat(row[col]))).length;
      const emptyCount = data.filter(row =>
        row[col] === null || row[col] === undefined || row[col] === ''
      ).length;

      let type = "文本";
      if (numericCount > data.length * 0.8) type = "数值";
      if (emptyCount > data.length * 0.5) type = "多为空";

      console.log(`  ${col}: ${type}`);
    });

    console.log("\n" + "=".repeat(70));
    console.log("✅ 分析完成！");
    console.log("=".repeat(70) + "\n");

  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);
    if (error.message.includes("find XLSX")) {
      console.error("\n提示: 请确保文件路径正确，且文件格式为 .xlsx 或 .xls");
    }
    process.exit(1);
  }
})();
