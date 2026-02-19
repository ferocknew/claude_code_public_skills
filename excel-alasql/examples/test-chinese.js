/**
 * 测试中文文件名直接读取
 *
 * 演示 AlaSQL 对中文的完整支持
 */

const { promise: alasql } = require('alasql');

console.log('='.repeat(60));
console.log('测试中文文件名读取');
console.log('='.repeat(60));

(async() => {
  try {
    // 直接读取中文文件名
    console.log('\n正在读取: /data/excel/故障树.xlsx');

    const data = await alasql(
      'SELECT * FROM XLSX("/data/excel/故障树.xlsx", {autoExt: false})'
    );

    console.log('\n✓ 读取成功！');
    console.log(`  行数: ${data.length}`);
    console.log(`  列数: ${Object.keys(data[0]).length}`);
    console.log(`  列名: ${Object.keys(data[0]).join(', ')}`);

    // 使用中文列名
    console.log('\n按"层次"分组统计:');
    const stats = {};
    data.forEach(row => {
      const level = row['层次'];
      stats[level] = (stats[level] || 0) + 1;
    });

    Object.entries(stats).forEach(([key, val]) => {
      console.log(`  ${key}: ${val} 个`);
    });

    // 筛选中文内容
    console.log('\n筛选"层次"为"中间事件"的记录:');
    const filtered = data.filter(row => row['层次'] === '中间事件');
    filtered.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row['事件编号']} - ${row['事件名称']}`);
    });

    console.log('\n✓ 中文支持完全正常！');

  } catch (error) {
    console.error('\n✗ 错误:', error.message);
  }
})();
