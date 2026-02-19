/**
 * 数据类型处理示例
 *
 * 演示如何在 AlaSQL 中处理不同的数据类型
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('数据类型处理示例');
console.log('='.repeat(60));

// 1. 读取并指定列类型
console.log('\n[1] 读取带标题的数据:');
console.log('const typed = alasql(`');
console.log('  SELECT * FROM XLSX("data.xlsx", {headers: true})');
console.log('`);');

// 2. 类型转换
console.log('\n[2] 类型转换（CAST）:');
console.log('const converted = alasql(`');
console.log('  SELECT');
console.log('    CAST(price AS NUMBER) as price,');
console.log('    CAST(date AS DATE) as order_date,');
console.log('    CAST(status AS STRING) as status');
console.log('  FROM XLSX("orders.xlsx")');
console.log('`);');

// 3. 数值操作
console.log('\n[3] 数值操作:');
console.log('const numeric = alasql(`');
console.log('  SELECT');
console.log('    price,');
console.log('    ROUND(price, 2) as rounded,');
console.log('    CEIL(price) as ceiling,');
console.log('    FLOOR(price) as floor,');
console.log('    ABS(price) as absolute');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 4. 字符串操作
console.log('\n[4] 字符串操作:');
console.log('const strings = alasql(`');
console.log('  SELECT');
console.log('    name,');
console.log('    UPPER(name) as upper_name,');
console.log('    LOWER(name) as lower_name,');
console.log('    TRIM(name) as trimmed_name,');
console.log('    SUBSTRING(name, 1, 3) as short_name');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 5. 日期操作
console.log('\n[5] 日期操作:');
console.log('const dates = alasql(`');
console.log('  SELECT');
console.log('    order_date,');
console.log('    YEAR(order_date) as year,');
console.log('    MONTH(order_date) as month,');
console.log('    DAY(order_date) as day,');
console.log('    DATE(order_date) as date_only');
console.log('  FROM XLSX("orders.xlsx")');
console.log('`);');

// 6. 空值处理
console.log('\n[6] 空值处理:');
console.log('const handled = alasql(`');
console.log('  SELECT');
console.log('    COALESCE(price, 0) as price,');
console.log('    NULLIF(quantity, 0) as quantity,');
console.log('    CASE');
console.log('      WHEN discount IS NULL THEN 0');
console.log('      ELSE discount');
console.log('    END as discount');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 7. 数据标准化
console.log('\n[7] 数据标准化:');
console.log('const normalized = alasql(`');
console.log('  SELECT');
console.log('    LOWER(TRIM(email)) as email,');
console.log('    ROUND(amount, 2) as amount,');
console.log('    UPPER(LEFT(status, 1)) + SUBSTRING(status, 2) as status');
console.log('  FROM XLSX("raw.xlsx")');
console.log('`);');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  const testData = [
    { name: '  张三  ', amount: '123.456', email: 'ZHANG@EXAMPLE.COM' },
    { name: '李四', amount: '78.901', email: 'li@example.com' }
  ];

  // 创建内存表
  alasql('CREATE TABLE test_table');
  testData.forEach(row => {
    alasql('INSERT INTO test_table VALUES ?', [row]);
  });

  // 类型转换和标准化
  const result = alasql(`
    SELECT
      TRIM(name) as name,
      CAST(amount AS NUMBER) as amount,
      ROUND(CAST(amount AS NUMBER), 2) as amount_rounded,
      LOWER(email) as email_normalized
    FROM test_table
  `);

  console.log('✓ 数据处理结果:');
  result.forEach((row, idx) => {
    console.log(`\n行 ${idx + 1}:`);
    console.log('  姓名:', row.name);
    console.log('  金额:', row.amount, '→', row.amount_rounded);
    console.log('  邮箱:', row.email_normalized);
  });

} catch (error) {
  console.error('错误:', error.message);
  console.log('\n提示: 确保已安装 alasql: npm install alasql');
}
