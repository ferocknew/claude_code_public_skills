/**
 * 写入 Excel 文件示例
 *
 * 演示各种写入 Excel 的方法
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('写入 Excel 文件示例');
console.log('='.repeat(60));

// 1. 从对象数组写入
console.log('\n[1] 从对象数组写入:');
console.log('const data = [');
console.log('  {name: "张三", age: 30},');
console.log('  {name: "李四", age: 25}');
console.log('];');
console.log('alasql(\'SELECT * INTO XLSX("output.xlsx") FROM ?\', [data]);');

// 2. 从查询结果写入
console.log('\n[2] 从查询结果写入:');
console.log('alasql(`');
console.log('  SELECT * INTO XLSX("report.xlsx")');
console.log('  FROM XLSX("data.xlsx")');
console.log('  WHERE status = "active"');
console.log('`);');

// 3. 指定工作表名称
console.log('\n[3] 指定工作表名称:');
console.log('alasql(`');
console.log('  SELECT * INTO XLSX("output.xlsx", {sheetid: "报表"})');
console.log('  FROM ?');
console.log('`, [data]);');

// 4. 多个工作表
console.log('\n[4] 写入多个工作表:');
console.log('alasql(\'SELECT * INTO XLSX("multi.xlsx", {sheetid: "Sheet1"}) FROM ?\', [data1]);');
console.log('alasql(\'SELECT * INTO XLSX("multi.xlsx", {sheetid: "Sheet2"}) FROM ?\', [data2]);');
console.log('alasql(\'SELECT * INTO XLSX("multi.xlsx", {sheetid: "Sheet3"}) FROM ?\', [data3]);');

// 5. 追加数据（不包含标题行）
console.log('\n[5] 追加到现有工作表:');
console.log('alasql(`');
console.log('  SELECT * INTO XLSX("output.xlsx", {sheetid: "Sheet2", headers: false})');
console.log('  FROM ?');
console.log('`, [newData]);');

// 6. 带格式选项
console.log('\n[6] 带格式选项写入:');
console.log('alasql(`');
console.log('  SELECT * INTO XLSX("output.xlsx", {');
console.log('    sheetid: "数据表",');
console.log('    headers: true');
console.log('  })');
console.log('  FROM ?');
console.log('`, [data]);');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  const data1 = [
    { name: '张三', age: 30, city: '北京' },
    { name: '李四', age: 25, city: '上海' }
  ];

  const data2 = [
    { product: '电脑', price: 5000 },
    { product: '手机', price: 3000 }
  ];

  // 写入单个文件
  alasql('SELECT * INTO XLSX("/tmp/single-sheet.xlsx") FROM ?', [data1]);
  console.log('✓ 已写入: /tmp/single-sheet.xlsx');

  // 写入多个工作表
  alasql('SELECT * INTO XLSX("/tmp/multi-sheets.xlsx", {sheetid: "用户"}) FROM ?', [data1]);
  alasql('SELECT * INTO XLSX("/tmp/multi-sheets.xlsx", {sheetid: "产品"}) FROM ?', [data2]);
  console.log('✓ 已写入多工作表文件: /tmp/multi-sheets.xlsx');
  console.log('  - 工作表1: 用户');
  console.log('  - 工作表2: 产品');

  console.log('\n提示: 使用 Excel 打开 /tmp/ 目录中的文件查看结果');

} catch (error) {
  console.error('错误:', error.message);
  console.log('\n提示: 确保已安装 alasql: npm install alasql');
}
