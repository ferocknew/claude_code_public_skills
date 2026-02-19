/**
 * 读取各种格式的文件
 *
 * 演示 AlaSQL 支持的所有输入格式
 *
 * 推荐使用 Promise 方式: const { promise: alasql } = require('alasql');
 */

const { promise: alasql } = require('alasql');

console.log('='.repeat(60));
console.log('AlaSQL 读取格式示例');
console.log('='.repeat(60));

// 代码示例（不执行，只展示）
console.log('\n=== XLSX 文件（推荐）===');
console.log('// 读取 XLSX（注意 autoExt: false 选项）');
console.log('const data = await alasql(');
console.log('  \'SELECT * FROM XLSX("data.xlsx", {autoExt: false})');
console.log(');');

console.log('\n=== CSV 文件 ===');
console.log('const data = await alasql(\'SELECT * FROM CSV("data.csv")\');');

console.log('\n=== 自定义分隔符 CSV ===');
console.log('const data = await alasql(');
console.log('  \'SELECT * FROM CSV("data.txt", {separator: "\\t"})');
console.log(');');

console.log('\n=== JSON 文件 ===');
console.log('const data = await alasql(\'SELECT * FROM JSON("data.json")\');');

console.log('\n=== 带选项读取 ===');
console.log('const data = await alasql(');
console.log('  \'SELECT * FROM XLSX("data.xlsx", {');
console.log('    sheetid: "Sheet2",    // 工作表名称');
console.log('    range: "A1:E100",     // 单元格范围');
console.log('    autoExt: false        // 不自动添加扩展名');
console.log('  })');
console.log(');');

// 实际运行示例
(async() => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('实际运行示例');
    console.log('='.repeat(60));

    // 读取实际文件
    const data = await alasql(
      'SELECT * FROM XLSX("/data/excel/故障树.xlsx", {autoExt: false})'
    );

    console.log('\n✓ 读取成功！');
    console.log(`  行数: ${data.length}`);
    console.log(`  列数: ${Object.keys(data[0]).length}`);
    console.log(`  列名: ${Object.keys(data[0]).join(', ')}`);

    console.log('\n前3行预览:');
    data.slice(0, 3).forEach((row, i) => {
      console.log(`\n行 ${i + 1}:`);
      console.log(`  层次: ${row.层次}`);
      console.log(`  事件编号: ${row.事件编号}`);
    });

  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.log('\n提示: 确保已安装依赖: npm install alasql xlsx');
  }
})();
