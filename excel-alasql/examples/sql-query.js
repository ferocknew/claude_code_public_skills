/**
 * 高级 SQL 查询示例
 *
 * 演示 AlaSQL 支持的各种 SQL 操作
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('AlaSQL 高级 SQL 查询示例');
console.log('='.repeat(60));

// 1. 筛选数据
console.log('\n[1] WHERE 筛选:');
console.log('const filtered = alasql(`');
console.log('  SELECT * FROM XLSX("sales.xlsx")');
console.log('  WHERE category = "Electronics" AND quantity > 10');
console.log('`);');

// 2. 聚合
console.log('\n[2] GROUP BY 聚合:');
console.log('const summary = alasql(`');
console.log('  SELECT');
console.log('    category,');
console.log('    SUM(amount) as total,');
console.log('    AVG(amount) as average,');
console.log('    COUNT(*) as count');
console.log('  FROM XLSX("sales.xlsx")');
console.log('  GROUP BY category');
console.log('`);');

// 3. 连接多个工作表
console.log('\n[3] JOIN 表连接:');
console.log('const joined = alasql(`');
console.log('  SELECT a.*, b.category');
console.log('  FROM XLSX("orders.xlsx") a');
console.log('  LEFT JOIN XLSX("products.xlsx") b');
console.log('  ON a.product_id = b.id');
console.log('`);');

// 4. 排序和限制
console.log('\n[4] ORDER BY + LIMIT:');
console.log('const top10 = alasql(`');
console.log('  SELECT * FROM XLSX("data.xlsx")');
console.log('  ORDER BY sales DESC');
console.log('  LIMIT 10');
console.log('`);');

// 5. HAVING 子句
console.log('\n[5] HAVING 分组筛选:');
console.log('const filteredGroups = alasql(`');
console.log('  SELECT');
console.log('    category,');
console.log('    SUM(amount) as total');
console.log('  FROM XLSX("sales.xlsx")');
console.log('  GROUP BY category');
console.log('  HAVING SUM(amount) > 10000');
console.log('`);');

// 6. CASE 表达式
console.log('\n[6] CASE 条件表达式:');
console.log('const categorized = alasql(`');
console.log('  SELECT');
console.log('    name,');
console.log('    amount,');
console.log('    CASE');
console.log('      WHEN amount > 1000 THEN "高"');
console.log('      WHEN amount > 500 THEN "中"');
console.log('      ELSE "低"');
console.log('    END as level');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 7. UNION 联合
console.log('\n[7] UNION 联合查询:');
console.log('const combined = alasql(`');
console.log('  SELECT name, email FROM XLSX("customers1.xlsx")');
console.log('  UNION');
console.log('  SELECT name, email FROM XLSX("customers2.xlsx")');
console.log('`);');

// 8. 子查询
console.log('\n[8] 子查询:');
console.log('const result = alasql(`');
console.log('  SELECT *');
console.log('  FROM XLSX("orders.xlsx")');
console.log('  WHERE customer_id IN (');
console.log('    SELECT id FROM XLSX("vip_customers.xlsx")');
console.log('  )');
console.log('`);');

// 9. 复杂组合查询
console.log('\n[9] 复杂组合查询:');
console.log('const complex = alasql(`');
console.log('  SELECT');
console.log('    a.category,');
console.log('    COUNT(*) as order_count,');
console.log('    SUM(b.amount) as total_amount');
console.log('  FROM XLSX("orders.xlsx") a');
console.log('  JOIN XLSX("order_items.xlsx") b ON a.id = b.order_id');
console.log('  WHERE a.order_date >= "2024-01-01"');
console.log('  GROUP BY a.category');
console.log('  HAVING COUNT(*) > 5');
console.log('  ORDER BY total_amount DESC');
console.log('  LIMIT 10');
console.log('`);');

// 10. 透视表
console.log('\n[10] 透视表:');
console.log('const pivot = alasql(`');
console.log('  SELECT');
console.log('    category,');
console.log('    SUM(CASE WHEN month = "Jan" THEN amount ELSE 0 END) as Jan,');
console.log('    SUM(CASE WHEN month = "Feb" THEN amount ELSE 0 END) as Feb,');
console.log('    SUM(CASE WHEN month = "Mar" THEN amount ELSE 0 END) as Mar');
console.log('  FROM XLSX("sales.xlsx")');
console.log('  GROUP BY category');
console.log('`);');

console.log('\n' + '='.repeat(60));
console.log('支持的 SQL 操作总结:');
console.log('='.repeat(60));
console.log('✓ SELECT - 列选择');
console.log('✓ WHERE - 条件筛选');
console.log('✓ JOIN - 表连接（LEFT, RIGHT, INNER, CROSS）');
console.log('✓ GROUP BY - 分组聚合');
console.log('✓ HAVING - 分组后筛选');
console.log('✓ ORDER BY - 排序');
console.log('✓ LIMIT - 限制行数');
console.log('✓ UNION - 联合查询');
console.log('✓ CASE - 条件表达式');
console.log('✓ 子查询 - 嵌套 SELECT');
console.log('✓ 聚合函数 - SUM(), COUNT(), AVG(), MIN(), MAX()');
