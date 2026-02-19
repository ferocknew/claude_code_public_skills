/**
 * 写入各种格式的文件
 *
 * 演示 AlaSQL 支持的所有输出格式
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('AlaSQL 写入格式示例');
console.log('='.repeat(60));

// 示例数据
const sampleData = [
  { name: '张三', age: 30, city: '北京' },
  { name: '李四', age: 25, city: '上海' },
  { name: '王五', age: 35, city: '广州' }
];

// 1. 写入 XLSX（推荐）
console.log('\n[1] 写入 XLSX 文件:');
console.log('alasql(\'SELECT * INTO XLSX("output.xlsx") FROM ?\', [data]);');

// 2. 写入特定工作表
console.log('\n[2] 写入特定工作表:');
console.log('alasql(\'SELECT * INTO XLSX("output.xlsx", {sheetid: "报表"}) FROM ?\', [data]);');

// 3. 追加到现有工作表
console.log('\n[3] 追加到现有工作表:');
console.log('alasql(\'SELECT * INTO XLSX("output.xlsx", {sheetid: "Sheet2", headers: false}) FROM ?\', [data]);');

// 4. 写入 CSV
console.log('\n[4] 写入 CSV 文件:');
console.log('alasql(\'SELECT * INTO CSV("output.csv") FROM ?\', [data]);');

// 5. 自定义 CSV 分隔符
console.log('\n[5] 写入带自定义分隔符的 CSV:');
console.log('alasql(\'SELECT * INTO CSV("output.csv", {separator: ";"}) FROM ?\', [data]);');

// 6. 写入 JSON
console.log('\n[6] 写入 JSON 文件:');
console.log('alasql(\'SELECT * INTO JSON("output.json") FROM ?\', [data]);');

// 7. 写入 HTML 表格
console.log('\n[7] 写入 HTML 表格:');
console.log('alasql(\'SELECT * INTO HTML("output.html") FROM ?\', [data]);');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 写入测试文件
  alasql('SELECT * INTO XLSX("/tmp/test-output.xlsx") FROM ?', [sampleData]);
  console.log('✓ 已写入 XLSX: /tmp/test-output.xlsx');

  alasql('SELECT * INTO CSV("/tmp/test-output.csv") FROM ?', [sampleData]);
  console.log('✓ 已写入 CSV: /tmp/test-output.csv');

  alasql('SELECT * INTO JSON("/tmp/test-output.json") FROM ?', [sampleData]);
  console.log('✓ 已写入 JSON: /tmp/test-output.json');

  console.log('\n提示: 文件已保存到 /tmp/ 目录');

} catch (error) {
  console.error('错误:', error.message);
  console.log('\n提示: 确保已安装 alasql: npm install alasql');
}
