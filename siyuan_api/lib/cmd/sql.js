/**
 * SQL 查询命令
 *
 * 思源笔记使用 SQLite 数据库，支持通过 SQL 查询数据
 * 常用表: blocks, spans, attributes, assets
 */

const { siyuanPost } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 执行 SQL 查询
 */
async function cmdSql(url, token, stmt, options) {
  if (!stmt) {
    console.error("错误: 请提供 SQL 语句");
    console.error("用法: node skill.js sql \"SELECT * FROM blocks LIMIT 10\"");
    process.exit(1);
  }

  try {
    const data = await siyuanPost(url, token, "/api/query/sql", { stmt });

    if (options.format === "json") {
      formatOutput(data, "json");
    } else if (options.format === "yaml") {
      formatOutput(data, "yaml");
    } else {
      const rows = Array.isArray(data) ? data : [];
      console.log(`\n查询结果: ${rows.length} 行\n`);

      if (rows.length === 0) {
        console.log("(无数据)");
        return;
      }

      // 尝试表格输出
      if (rows.length <= 50) {
        // 显示前几列的摘要
        rows.forEach((row, idx) => {
          const preview = Object.entries(row)
            .slice(0, 5)
            .map(([k, v]) => {
              const val = String(v || "");
              return `${k}: ${val.substring(0, 50)}${val.length > 50 ? "..." : ""}`;
            })
            .join(" | ");
          console.log(`${idx + 1}. ${preview}`);
        });
      } else {
        // 数据较多时使用 table 格式
        console.table(rows.slice(0, 100));
        if (rows.length > 100) {
          console.log(`(仅显示前 100 行，共 ${rows.length} 行)`);
        }
      }
    }
  } catch (error) {
    handleError(error, "SQL 查询失败");
  }
}

module.exports = { cmdSql };
