/**
 * 数据验证示例
 *
 * 演示如何使用 AlaSQL 验证 Excel 数据
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('数据验证示例');
console.log('='.repeat(60));

// 1. 检查空值
console.log('\n[1] 检查空值:');
console.log('const nullCheck = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("data.xlsx")');
console.log('  WHERE column_name IS NULL');
console.log('`);');
console.log('console.log(`空值数量: ${nullCheck.length}`);');

// 2. 检测重复
console.log('\n[2] 检测重复记录:');
console.log('const duplicates = alasql(`');
console.log('  SELECT');
console.log('    email,');
console.log('    COUNT(*) as count');
console.log('  FROM XLSX("users.xlsx")');
console.log('  GROUP BY email');
console.log('  HAVING COUNT(*) > 1');
console.log('`);');
console.log('if (duplicates.length > 0) {');
console.log('  console.log("发现重复邮箱:");');
console.log('  duplicates.forEach(d => console.log(`  ${d.email}: ${d.count} 次`));');
console.log('}');

// 3. 数据类型检查
console.log('\n[3] 数据类型检查（数值）:');
console.log('const invalidNumbers = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("data.xlsx")');
console.log('  WHERE ISNUMERIC(age) = 0 OR age IS NULL');
console.log('`);');

// 4. 范围验证
console.log('\n[4] 范围验证:');
console.log('const outOfRange = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("scores.xlsx")');
console.log('  WHERE score < 0 OR score > 100');
console.log('`);');

// 5. 格式验证（邮箱）
console.log('\n[5] 邮箱格式验证:');
console.log('const invalidEmails = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("users.xlsx")');
console.log('  WHERE email NOT LIKE "%@%.%"');
console.log('  OR email IS NULL');
console.log('`);');

// 6. 日期验证
console.log('\n[6] 日期验证:');
console.log('const invalidDates = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("orders.xlsx")');
console.log('  WHERE order_date IS NULL');
console.log('  OR order_date > CURRENT_DATE');
console.log('`);');

// 7. 必填字段检查
console.log('\n[7] 必填字段检查:');
console.log('const missingRequired = alasql(`');
console.log('  SELECT');
console.log('    id,');
console.log('    CASE');
console.log('      WHEN name IS NULL THEN \'name\'');
console.log('      WHEN email IS NULL THEN \'email\'');
console.log('      WHEN phone IS NULL THEN \'phone\'');
console.log('    END as missing_field');
console.log('  FROM XLSX("users.xlsx")');
console.log('  WHERE name IS NULL');
console.log('     OR email IS NULL');
console.log('     OR phone IS NULL');
console.log('`);');

// 8. 唯一性验证
console.log('\n[8] 唯一性验证（检查 ID 是否唯一）:');
console.log('const duplicateIds = alasql(`');
console.log('  SELECT');
console.log('    id,');
console.log('    COUNT(*) as count');
console.log('  FROM XLSX("data.xlsx")');
console.log('  GROUP BY id');
console.log('  HAVING COUNT(*) > 1');
console.log('`);');

// 9. 业务规则验证
console.log('\n[9] 业务规则验证（例如：结束日期必须大于开始日期）:');
console.log('const invalidDates = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("projects.xlsx")');
console.log('  WHERE end_date <= start_date');
console.log('`);');

// 10. 完整验证报告
console.log('\n[10] 生成完整验证报告:');
console.log('function validateExcel(filePath) {');
console.log('  const report = {');
console.log('    totalRows: 0,');
console.log('    emptyValues: 0,');
console.log('    duplicates: 0,');
console.log('    invalidTypes: 0,');
console.log('    errors: []');
console.log('  };');
console.log('  ');
console.log('  // 总行数');
console.log('  const data = alasql(`SELECT * FROM XLSX("${filePath}")`);');
console.log('  report.totalRows = data.length;');
console.log('  ');
console.log('  // 空值检查');
console.log('  const nulls = alasql(`SELECT * FROM XLSX("${filePath}") WHERE email IS NULL`);');
console.log('  report.emptyValues = nulls.length;');
console.log('  ');
console.log('  // 重复检查');
console.log('  const dups = alasql(`');
console.log('    SELECT email, COUNT(*) as c FROM XLSX("${filePath}")');
console.log('    GROUP BY email HAVING c > 1');
console.log('  `);');
console.log('  report.duplicates = dups.length;');
console.log('  ');
console.log('  return report;');
console.log('}');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 创建测试数据
  const testData = [
    { id: 1, name: '张三', email: 'zhang@example.com', age: 25 },
    { id: 2, name: '李四', email: 'li@example.com', age: 30 },
    { id: 3, name: '', email: 'invalid-email', age: -5 },  // 无效数据
    { id: 2, name: '王五', email: 'zhang@example.com', age: 28 }  // 重复 ID 和邮箱
  ];

  alasql('CREATE TABLE users');
  testData.forEach(row => {
    alasql('INSERT INTO users VALUES ?', [row]);
  });

  console.log('测试数据:', testData.length, '行');

  // 检查空值
  console.log('\n[验证 1] 检查空 name:');
  const emptyNames = alasql('SELECT * FROM users WHERE name IS NULL OR name = ""');
  console.log(`  发现 ${emptyNames.length} 行空 name`);

  // 检查重复邮箱
  console.log('\n[验证 2] 检查重复邮箱:');
  const dupEmails = alasql(`
    SELECT email, COUNT(*) as count
    FROM users
    GROUP BY email
    HAVING count > 1
  `);
  dupEmails.forEach(d => {
    console.log(`  ${d.email}: ${d.count} 次`);
  });

  // 检查年龄范围
  console.log('\n[验证 3] 检查年龄范围（0-120）:');
  const invalidAge = alasql('SELECT * FROM users WHERE age < 0 OR age > 120');
  invalidAge.forEach(row => {
    console.log(`  无效年龄: ${row.name} - ${row.age}`);
  });

  // 检查邮箱格式
  console.log('\n[验证 4] 检查邮箱格式:');
  const invalidEmails = alasql(`
    SELECT *
    FROM users
    WHERE email NOT LIKE '%@%.%'
       OR email IS NULL
       OR email = ''
  `);
  invalidEmails.forEach(row => {
    console.log(`  无效邮箱: ${row.name} - ${row.email}`);
  });

  // 清理
  alasql('DROP TABLE users');

} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('常见验证规则');
console.log('='.repeat(60));
console.log('✓ 空值检查: WHERE column IS NULL');
console.log('✓ 重复检查: GROUP BY ... HAVING COUNT(*) > 1');
console.log('✓ 类型检查: WHERE ISNUMERIC(column) = 0');
console.log('✓ 范围检查: WHERE value < min OR value > max');
console.log('✓ 格式检查: WHERE column NOT LIKE \'pattern\'');
console.log('✓ 长度检查: WHERE LENGTH(column) < n');
console.log('✓ 日期检查: WHERE date > CURRENT_DATE');
