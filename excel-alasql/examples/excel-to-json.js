/**
 * Excel 转 JSON 示例
 *
 * 演示如何将 Excel 文件转换为 JSON 格式
 */

const alasql = require('alasql');
const fs = require('fs');

console.log('='.repeat(60));
console.log('Excel 转 JSON 示例');
console.log('='.repeat(60));

// 1. 读取 Excel 为 JSON
console.log('\n[1] 读取 Excel 为 JSON:');
console.log('const jsonData = alasql(\'SELECT * FROM XLSX("data.xlsx")\');');
console.log('console.log(JSON.stringify(jsonData, null, 2));');

// 2. 保存 JSON 到文件
console.log('\n[2] 保存 JSON 到文件:');
console.log('const data = alasql(\'SELECT * FROM XLSX("input.xlsx")\');');
console.log('fs.writeFileSync(');
console.log('  \'output.json\',');
console.log('  JSON.stringify(data, null, 2),');
console.log('  \'utf8\'');
console.log(');');

// 3. 格式化输出
console.log('\n[3] 格式化输出（美化）:');
console.log('const formatted = JSON.stringify(data, null, 2);');
console.log('// 或者使用 4 个空格缩进');
console.log('const formatted = JSON.stringify(data, null, 4);');

// 4. 紧凑格式（无空格）
console.log('\n[4] 紧凑格式（文件更小）:');
console.log('const compact = JSON.stringify(data);');

// 5. 选择性转换（指定列）
console.log('\n[5] 选择性转换（指定列）:');
console.log('const selected = alasql(`');
console.log('  SELECT name, email, age FROM XLSX("users.xlsx")');
console.log('`);');
console.log('fs.writeFileSync(\'users.json\', JSON.stringify(selected, null, 2));');

// 6. 条件转换
console.log('\n[6] 条件转换（筛选后转换）:');
console.log('const filtered = alasql(`');
console.log('  SELECT * FROM XLSX("orders.xlsx")');
console.log('  WHERE status = "completed"');
console.log('`);');
console.log('fs.writeFileSync(');
console.log('  \'completed-orders.json\',');
console.log('  JSON.stringify(filtered, null, 2)');
console.log(');');

// 7. 聚合后转换
console.log('\n[7] 聚合后转换:');
console.log('const summary = alasql(`');
console.log('  SELECT');
console.log('    category,');
console.log('    SUM(amount) as total');
console.log('  FROM XLSX("sales.xlsx")');
console.log('  GROUP BY category');
console.log('`);');
console.log('fs.writeFileSync(');
console.log('  \'sales-summary.json\',');
console.log('  JSON.stringify(summary, null, 2)');
console.log(');');

// 8. 多工作表转 JSON
console.log('\n[8] 多工作表转 JSON:');
console.log('const sheets = {');
console.log('  sheet1: alasql(\'SELECT * FROM XLSX("data.xlsx", {sheetid: "Sheet1"})\'),');
console.log('  sheet2: alasql(\'SELECT * FROM XLSX("data.xlsx", {sheetid: "Sheet2"})\'),');
console.log('  sheet3: alasql(\'SELECT * FROM XLSX("data.xlsx", {sheetid: "Sheet3"})\')');
console.log('};');
console.log('fs.writeFileSync(');
console.log('  \'all-sheets.json\',');
console.log('  JSON.stringify(sheets, null, 2)');
console.log(');');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 创建测试数据
  const testData = [
    { id: 1, name: '张三', age: 30, city: '北京' },
    { id: 2, name: '李四', age: 25, city: '上海' },
    { id: 3, name: '王五', age: 35, city: '广州' }
  ];

  // 保存为 Excel
  alasql('SELECT * INTO XLSX("/tmp/test-data.xlsx") FROM ?', [testData]);
  console.log('✓ 已创建测试文件: /tmp/test-data.xlsx');

  // 读取并转换为 JSON
  const jsonData = alasql('SELECT * FROM XLSX("/tmp/test-data.xlsx")');
  console.log('\n✓ 读取数据:', jsonData.length, '行');

  // 格式化输出
  const formatted = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync('/tmp/test-data.json', formatted, 'utf8');
  console.log('✓ 已保存 JSON: /tmp/test-data.json');

  // 显示前几行
  console.log('\nJSON 内容预览:');
  console.log(formatted.substring(0, 300) + '...');

  // 紧凑格式
  const compact = JSON.stringify(jsonData);
  fs.writeFileSync('/tmp/test-data-compact.json', compact, 'utf8');
  console.log('\n✓ 紧凑格式: /tmp/test-data-compact.json');
  console.log('  文件大小:', formatted.length, '字节');
  console.log('  紧凑大小:', compact.length, '字节');
  console.log('  节省:', Math.round((1 - compact.length / formatted.length) * 100), '%');

} catch (error) {
  console.error('错误:', error.message);
  console.log('\n提示: 确保已安装 alasql: npm install alasql');
}

console.log('\n' + '='.repeat(60));
console.log('使用场景');
console.log('='.repeat(60));
console.log('✓ Web API 数据交换');
console.log('✓ JavaScript 应用数据导入');
console.log('✓ 配置文件格式转换');
console.log('✓ 数据备份和迁移');
console.log('✓ 前端图表数据准备');
