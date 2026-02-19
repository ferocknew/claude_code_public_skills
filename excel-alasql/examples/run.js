/**
 * 测试完整参数 npx 方式
 */

const { promise: alasql } = require("alasql");

console.log('='.repeat(60));
console.log('测试完整参数 npx 方式');
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

    console.log('\n✓ 完整参数 npx 方式测试成功！');

  } catch (error) {
    console.error('\n✗ 错误:', error.message);
  }
})();
