/**
 * 批量处理多个文件示例
 *
 * 演示如何使用 AlaSQL 批量处理多个 Excel 文件
 */

const alasql = require('alasql');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('批量处理多个文件示例');
console.log('='.repeat(60));

// 1. 合并多个 Excel 文件
console.log('\n[1] 合并多个文件:');
console.log('const files = ["file1.xlsx", "file2.xlsx", "file3.xlsx"];');
console.log('const merged = [];');
console.log('files.forEach(file => {');
console.log('  const data = alasql(`SELECT * FROM XLSX("${file}")`);');
console.log('  merged.push(...data);');
console.log('});');
console.log('alasql(\'SELECT * INTO XLSX("merged.xlsx") FROM ?\', [merged]);');

// 2. 批量转换格式
console.log('\n[2] 批量 Excel 转 CSV:');
console.log('const files = fs.readdirSync("./data");');
console.log('files.filter(f => f.endsWith(".xlsx")).forEach(file => {');
console.log('  const name = path.basename(file, ".xlsx");');
console.log('  alasql(`');
console.log('    SELECT * INTO CSV("./output/${name}.csv")');
console.log('    FROM XLSX("./data/${file}")');
console.log('  `);');
console.log('  console.log(`✓ 已转换: ${file}`);');
console.log('});');

// 3. 批量统计
console.log('\n[3] 批量统计信息:');
console.log('const files = ["sales1.xlsx", "sales2.xlsx", "sales3.xlsx"];');
console.log('const summary = [];');
console.log('files.forEach(file => {');
console.log('  const result = alasql(`');
console.log('    SELECT SUM(amount) as total FROM XLSX("${file}")');
console.log('  `);');
console.log('  summary.push({ file, total: result[0].total });');
console.log('  console.log(`${file}: ${result[0].total}`);');
console.log('});');
console.log('alasql(\'SELECT * INTO XLSX("summary.xlsx") FROM ?\', [summary]);');

// 4. 批量数据验证
console.log('\n[4] 批量数据验证:');
console.log('function validateBatch(files) {');
console.log('  const report = [];');
console.log('  files.forEach(file => {');
console.log('    const data = alasql(`SELECT * FROM XLSX("${file}")`);');
console.log('    const nulls = alasql(`');
console.log('      SELECT COUNT(*) as c FROM XLSX("${file}") WHERE email IS NULL');
console.log('    `)[0].c;');
console.log('    report.push({');
console.log('      file,');
console.log('      total: data.length,');
console.log('      nulls');
console.log('    });');
console.log('  });');
console.log('  return report;');
console.log('}');

// 5. 条件批量处理
console.log('\n[5] 条件批量处理（只处理修改日期在某个时间之后的文件）:');
console.log('const files = fs.readdirSync("./data");');
console.log('const cutoffDate = new Date("2024-01-01");');
console.log('files.forEach(file => {');
console.log('  const fullPath = path.join("./data", file);');
console.log('  const stats = fs.statSync(fullPath);');
console.log('  if (stats.mtime >= cutoffDate) {');
console.log('    console.log(`处理: ${file}`);');
console.log('    // 处理文件...');
console.log('  }');
console.log('});');

// 6. 批量数据清洗
console.log('\n[6] 批量数据清洗:');
console.log('function cleanBatch(files) {');
console.log('  files.forEach(file => {');
console.log('    const cleaned = alasql(`');
console.log('      SELECT');
console.log('        LOWER(TRIM(email)) as email,');
console.log('        ROUND(amount, 2) as amount');
console.log('      FROM XLSX("${file}")');
console.log('    `);');
console.log('    const outName = path.basename(file, ".xlsx") + "-clean.xlsx";');
console.log('    alasql(`SELECT * INTO XLSX("${outName}") FROM ?`, [cleaned]);');
console.log('  });');
console.log('}');

// 7. 批量提取特定数据
console.log('\n[7] 批量提取特定数据:');
console.log('function extractData(files, condition) {');
console.log('  const allData = [];');
console.log('  files.forEach(file => {');
console.log('    const data = alasql(`');
console.log('      SELECT * FROM XLSX("${file}") WHERE ${condition}');
console.log('    `);');
console.log('    allData.push(...data);');
console.log('  });');
console.log('  return allData;');
console.log('}');
console.log('');
console.log('// 示例：提取所有状态为 "completed" 的订单');
console.log('const completed = extractData(files, \'status = "completed"\');');

// 8. 批量生成报表
console.log('\n[8] 批量生成报表:');
console.log('function generateReports(files) {');
console.log('  files.forEach(file => {');
console.log('    const summary = alasql(`');
console.log('      SELECT');
console.log('        category,');
console.log('        COUNT(*) as count,');
console.log('        SUM(amount) as total');
console.log('      FROM XLSX("${file}")');
console.log('      GROUP BY category');
console.log('    `);');
console.log('    const reportName = "report-" + path.basename(file, ".xlsx") + ".xlsx";');
console.log('    alasql(`SELECT * INTO XLSX("${reportName}") FROM ?`, [summary]);');
console.log('  });');
console.log('}');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 创建测试文件
  const data1 = [
    { product: 'A', amount: 100 },
    { product: 'B', amount: 200 }
  ];

  const data2 = [
    { product: 'C', amount: 150 },
    { product: 'D', amount: 250 }
  ];

  alasql('SELECT * INTO XLSX("/tmp/batch1.xlsx") FROM ?', [data1]);
  alasql('SELECT * INTO XLSX("/tmp/batch2.xlsx") FROM ?', [data2]);
  console.log('✓ 已创建测试文件');

  // 批量读取
  console.log('\n批量读取并合并:');
  const files = ['/tmp/batch1.xlsx', '/tmp/batch2.xlsx'];
  const merged = [];

  files.forEach(file => {
    const data = alasql(`SELECT * FROM XLSX("${file}")`);
    console.log(`  ${file}: ${data.length} 行`);
    merged.push(...data);
  });

  console.log(`\n合并后: ${merged.length} 行`);

  // 保存合并结果
  alasql('SELECT * INTO XLSX("/tmp/merged.xlsx") FROM ?', [merged]);
  console.log('✓ 已保存: /tmp/merged.xlsx');

  // 批量统计
  console.log('\n批量统计:');
  const summary = alasql(`
    SELECT
      product,
      SUM(amount) as total
    FROM ?
    GROUP BY product
  `, [merged]);

  summary.forEach(row => {
    console.log(`  ${row.product}: ${row.total}`);
  });

} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('性能提示');
console.log('='.repeat(60));
console.log('1. 顺序处理文件，避免并行（节省内存）');
console.log('2. 大批量使用流式处理或分批处理');
console.log('3. 处理完及时清理: alasql(\'DROP TABLE table_name\')');
console.log('4. 使用 WHERE 尽早筛选数据');
console.log('5. 只选择需要的列: SELECT col1, col2');
