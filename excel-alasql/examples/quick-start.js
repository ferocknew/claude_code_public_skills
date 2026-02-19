#!/usr/bin/env -S npx -y -p alasql@1.7.3 -p xlsx node
/**
 * 快速开始 - 使用 Promise 方式（推荐）
 *
 * 这是 AlaSQL + SheetJS 的现代用法
 *
 * === 无需本地安装依赖 ===
 *
 * 运行方式 1（直接执行）:
 *   chmod +x quick-start.js
 *   ./quick-start.js
 *
 * 运行方式 2（使用 node）:
 *   node quick-start.js
 *
 * 说明: 首次运行会下载依赖，之后使用缓存
 */

const { promise: alasql } = require("alasql");

console.log('='.repeat(60));
console.log('AlaSQL 快速开始（无需本地安装）');
console.log('='.repeat(60));

(async() => {
  try {
    // === 读取 Excel ===
    console.log('\n[1] 读取 Excel 文件:');
    const data = await alasql(
      'SELECT * FROM XLSX("/data/excel/故障树.xlsx", {autoExt: false})'
    );

    console.log(`✓ 读取成功！`);
    console.log(`  行数: ${data.length}`);
    console.log(`  列数: ${Object.keys(data[0]).length}`);

    // === SQL 查询 ===
    console.log('\n[2] SQL 查询 - 前3行:');
    const top3 = await alasql('SELECT * FROM ? LIMIT 3', [data]);
    top3.forEach((row, i) => {
      console.log(`\n  行 ${i + 1}:`);
      console.log(`    层次: ${row.层次}`);
      console.log(`    事件编号: ${row.事件编号}`);
      console.log(`    事件名称: ${row.事件名称.substring(0, 30)}...`);
    });

    // === 筛选数据 ===
    console.log('\n[3] 筛选中间事件:');
    const filtered = data.filter(row => row['层次'] === '中间事件');
    console.log(`  找到 ${filtered.length} 个中间事件`);

    // === 聚合统计 ===
    console.log('\n[4] 按层次分组:');
    const stats = {};
    data.forEach(row => {
      const level = row['层次'];
      stats[level] = (stats[level] || 0) + 1;
    });
    Object.entries(stats).forEach(([key, val]) => {
      console.log(`  ${key}: ${val} 个`);
    });

    // === 写入 Excel ===
    console.log('\n[5] 写入新 Excel:');
    await alasql('SELECT * INTO XLSX("/tmp/output.xlsx") FROM ?', [data]);
    console.log('  ✓ 已保存到 /tmp/output.xlsx');

    console.log('\n✓ 所有操作完成！');

  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
  }
})();
