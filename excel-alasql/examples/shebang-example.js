#!/usr/bin/env -S npx -y -p alasql@1.7.3 -p xlsx node
/**
 * 无需本地安装依赖的示例
 *
 * 直接运行即可，无需 npm install
 *
 * 运行方式:
 *   chmod +x shebang-example.js
 *   ./shebang-example.js
 *
 * 或者:
 *   node shebang-example.js
 */

const { promise: alasql } = require("alasql");

console.log('='.repeat(60));
console.log('读取 Excel（无需本地安装依赖）');
console.log('='.repeat(60));

(async() => {
  try {
    const data = await alasql(
      'SELECT * FROM XLSX("/data/excel/故障树.xlsx", {autoExt: false})'
    );

    console.log('\n✓ 读取成功！');
    console.log(`  行数: ${data.length}`);
    console.log(`  列名: ${Object.keys(data[0]).join(', ')}`);

    console.log('\n按"层次"分组:');
    const stats = {};
    data.forEach(row => {
      const level = row['层次'];
      stats[level] = (stats[level] || 0) + 1;
    });
    Object.entries(stats).forEach(([key, val]) => {
      console.log(`  ${key}: ${val} 个`);
    });

  } catch (error) {
    console.error('\n✗ 错误:', error.message);
  }
})();
