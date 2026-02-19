/**
 * 数据转换示例
 *
 * 演示如何使用 AlaSQL 转换和标准化数据
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('数据转换示例');
console.log('='.repeat(60));

// 1. 透视表
console.log('\n[1] 透视表（行转列）:');
console.log('const pivot = alasql(`');
console.log('  SELECT');
console.log('    category,');
console.log('    SUM(CASE WHEN month = "Jan" THEN amount ELSE 0 END) as Jan,');
console.log('    SUM(CASE WHEN month = "Feb" THEN amount ELSE 0 END) as Feb,');
console.log('    SUM(CASE WHEN month = "Mar" THEN amount ELSE 0 END) as Mar,');
console.log('    SUM(CASE WHEN month = "Apr" THEN amount ELSE 0 END) as Apr');
console.log('  FROM XLSX("sales.xlsx")');
console.log('  GROUP BY category');
console.log('`);');

// 2. 数据标准化（字符串）
console.log('\n[2] 字符串标准化:');
console.log('const normalized = alasql(`');
console.log('  SELECT');
console.log('    UPPER(LEFT(name, 1)) + LOWER(SUBSTRING(name, 2)) as name,');
console.log('    LOWER(TRIM(email)) as email,');
console.log('    UPPER(code) as code');
console.log('  FROM XLSX("raw.xlsx")');
console.log('`);');

// 3. 数值标准化
console.log('\n[3] 数值标准化:');
console.log('const cleaned = alasql(`');
console.log('  SELECT');
console.log('    ROUND(price, 2) as price,');
console.log('    ROUND(rate, 4) as rate,');
console.log('    CAST(amount AS NUMBER) as amount');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 4. 日期格式转换
console.log('\n[4] 日期格式转换:');
console.log('const formatted = alasql(`');
console.log('  SELECT');
console.log('    order_date,');
console.log('    YEAR(order_date) as year,');
console.log('    MONTH(order_date) as month,');
console.log('    DAY(order_date) as day,');
console.log('    CAST(order_date AS STRING) as date_string');
console.log('  FROM XLSX("orders.xlsx")');
console.log('`);');

// 5. 数据合并（字符串拼接）
console.log('\n[5] 数据合并:');
console.log('const merged = alasql(`');
console.log('  SELECT');
console.log('    first_name + " " + last_name as full_name,');
console.log('    city + ", " + country as location');
console.log('  FROM XLSX("users.xlsx")');
console.log('`);');

// 6. 条件转换
console.log('\n[6] 条件转换（CASE）:');
console.log('const categorized = alasql(`');
console.log('  SELECT');
console.log('    amount,');
console.log('    CASE');
console.log('      WHEN amount < 100 THEN "低"');
console.log('      WHEN amount < 1000 THEN "中"');
console.log('      WHEN amount < 10000 THEN "高"');
console.log('      ELSE "非常高"');
console.log('    END as level');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 7. 空值处理
console.log('\n[7] 空值处理:');
console.log('const handled = alasql(`');
console.log('  SELECT');
console.log('    COALESCE(discount, 0) as discount,');
console.log('    COALESCE(email, "无邮箱") as email,');
console.log('    NULLIF(quantity, 0) as quantity');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 8. 数据去重
console.log('\n[8] 数据去重:');
console.log('const unique = alasql(`');
console.log('  SELECT DISTINCT email, name');
console.log('  FROM XLSX("users.xlsx")');
console.log('`);');

// 9. 数据排序
console.log('\n[9] 多列排序:');
console.log('const sorted = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("data.xlsx")');
console.log('  ORDER BY category ASC, amount DESC, date ASC');
console.log('`);');

// 10. 分箱（Binning）
console.log('\n[10] 数值分箱:');
console.log('const binned = alasql(`');
console.log('  SELECT');
console.log('    age,');
console.log('    CASE');
console.log('      WHEN age < 18 THEN "未成年"');
console.log('      WHEN age < 30 THEN "青年"');
console.log('      WHEN age < 50 THEN "中年"');
console.log('      ELSE "老年"');
console.log('    END as age_group');
console.log('  FROM XLSX("users.xlsx")');
console.log('`);');

// 11. 数据类型转换
console.log('\n[11] 批量类型转换:');
console.log('const converted = alasql(`');
console.log('  SELECT');
console.log('    CAST(id AS NUMBER) as id,');
console.log('    CAST(price AS NUMBER) as price,');
console.log('    CAST(date AS DATE) as order_date,');
console.log('    CAST(active AS NUMBER) as is_active');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 12. 计算字段
console.log('\n[12] 计算衍生字段:');
console.log('const calculated = alasql(`');
console.log('  SELECT');
console.log('    quantity,');
console.log('    unit_price,');
console.log('    quantity * unit_price as total_price,');
console.log('    quantity * unit_price * 0.1 as tax,');
console.log('    quantity * unit_price * 1.1 as total_with_tax');
console.log('  FROM XLSX("orders.xlsx")');
console.log('`);');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 创建测试数据
  const rawData = [
    { first_name: '  zhang', last_name: 'san', email: 'ZHANG@EXAMPLE.COM  ', age: 25, score: 85.567 },
    { first_name: 'LI', last_name: 'si', email: 'li@example.com', age: 30, score: 92.345 },
    { first_name: 'wang', last_name: 'wu', email: 'WANG@EXAMPLE.COM', age: -5, score: 78.123 }
  ];

  alasql('CREATE TABLE raw_data');
  rawData.forEach(row => {
    alasql('INSERT INTO raw_data VALUES ?', [row]);
  });

  console.log('原始数据:', rawData.length, '行');

  // 数据转换
  const transformed = alasql(`
    SELECT
      UPPER(LEFT(first_name, 1)) + LOWER(SUBSTRING(first_name, 2)) as first_name,
      UPPER(LEFT(last_name, 1)) + LOWER(SUBSTRING(last_name, 2)) as last_name,
      LOWER(TRIM(email)) as email,
      age,
      ROUND(score, 1) as score,
      CASE
        WHEN age < 0 THEN "无效"
        WHEN age < 18 THEN "未成年"
        WHEN age < 60 THEN "成年"
        ELSE "老年"
      END as age_group
    FROM raw_data
  `);

  console.log('\n转换后数据:');
  transformed.forEach((row, idx) => {
    console.log(`\n${idx + 1}. ${row.first_name} ${row.last_name}`);
    console.log('   邮箱:', row.email);
    console.log('   年龄:', row.age, `(${row.age_group})`);
    console.log('   分数:', row.score);
  });

  // 清理
  alasql('DROP TABLE raw_data');

} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('常见转换场景');
console.log('='.repeat(60));
console.log('✓ 数据清洗: TRIM(), LOWER(), UPPER()');
console.log('✓ 格式转换: CAST(), ROUND()');
console.log('✓ 数据分类: CASE WHEN');
console.log('✓ 数据合并: 字符串拼接 (+)');
console.log('✓ 空值处理: COALESCE(), NULLIF()');
console.log('✓ 去重: SELECT DISTINCT');
console.log('✓ 透视表: CASE + SUM() + GROUP BY');
console.log('✓ 计算字段: 数值运算');
