/**
 * 内存数据库示例
 *
 * 演示如何使用 AlaSQL 创建和查询内存数据库
 */

const alasql = require('alasql');

console.log('='.repeat(60));
console.log('内存数据库示例');
console.log('='.repeat(60));

// 1. 从 Excel 创建数据库
console.log('\n[1] 从 Excel 创建内存表:');
console.log('alasql(\'CREATE TABLE sales FROM XLSX("sales.xlsx")\');');
console.log('const result = alasql(\'SELECT * FROM sales WHERE amount > 100\');');

// 2. 加载多个表
console.log('\n[2] 加载多个表并关联:');
console.log('alasql(\'CREATE TABLE orders FROM XLSX("orders.xlsx")\');');
console.log('alasql(\'CREATE TABLE customers FROM XLSX("customers.xlsx")\');');
console.log('alasql(\'CREATE TABLE products FROM XLSX("products.xlsx")\');');

// 3. 跨表查询（JOIN）
console.log('\n[3] 跨表查询:');
console.log('const joined = alasql(`');
console.log('  SELECT');
console.log('    c.name as customer_name,');
console.log('    o.order_date,');
console.log('    p.product_name,');
console.log('    oi.quantity,');
console.log('    oi.price');
console.log('  FROM orders o');
console.log('  JOIN customers c ON o.customer_id = c.id');
console.log('  JOIN order_items oi ON o.id = oi.order_id');
console.log('  JOIN products p ON oi.product_id = p.id');
console.log('  WHERE o.order_date >= "2024-01-01"');
console.log('`);');

// 4. 创建索引
console.log('\n[4] 创建索引（提升查询性能）:');
console.log('alasql(\'CREATE INDEX idx_customer_id ON orders(customer_id)\');');
console.log('alasql(\'CREATE INDEX idx_product_id ON order_items(product_id)\');');

// 5. 创建视图
console.log('\n[5] 创建视图（简化复杂查询）:');
console.log('alasql(`');
console.log('  CREATE VIEW order_summary AS');
console.log('  SELECT');
console.log('    customer_id,');
console.log('    COUNT(*) as order_count,');
console.log('    SUM(total) as total_amount');
console.log('  FROM orders');
console.log('  GROUP BY customer_id');
console.log('`);');
console.log('const summary = alasql(\'SELECT * FROM order_summary\');');

// 6. 插入数据
console.log('\n[6] 插入数据:');
console.log('alasql(\'INSERT INTO customers VALUES ?', [{');
console.log('  id: 1,');
console.log('  name: "张三",');
console.log('  email: "zhang@example.com"');
console.log('}]);');

// 7. 更新数据
console.log('\n[7] 更新数据:');
console.log('alasql(`');
console.log('  UPDATE customers');
console.log('  SET email = "newemail@example.com"');
console.log('  WHERE id = 1');
console.log('`);');

// 8. 删除数据
console.log('\n[8] 删除数据:');
console.log('alasql(\'DELETE FROM orders WHERE order_date < "2023-01-01"\');');

// 9. 聚合查询
console.log('\n[9] 复杂聚合:');
console.log('const analytics = alasql(`');
console.log('  SELECT');
console.log('    c.name,');
console.log('    COUNT(o.id) as order_count,');
console.log('    SUM(o.total) as total_spent,');
console.log('    AVG(o.total) as avg_order,');
console.log('    MIN(o.order_date) as first_order,');
console.log('    MAX(o.order_date) as last_order');
console.log('  FROM customers c');
console.log('  LEFT JOIN orders o ON c.id = o.customer_id');
console.log('  GROUP BY c.id, c.name');
console.log('  ORDER BY total_spent DESC');
console.log('`);');

// 10. 事务处理（模拟）
console.log('\n[10] 批量操作:');
console.log('alasql(\'BEGIN\');');
console.log('try {');
console.log('  alasql(\'INSERT INTO orders VALUES ?\', [orderData]);');
console.log('  alasql(\'INSERT INTO order_items VALUES ?\', [itemsData]);');
console.log('  alasql(\'UPDATE products SET stock = stock - ? WHERE id = ?\', [qty, pid]);');
console.log('  alasql(\'COMMIT\');');
console.log('} catch (e) {');
console.log('  alasql(\'ROLLBACK\');');
console.log('}');

// 11. 清理表
console.log('\n[11] 清理表（释放内存）:');
console.log('alasql(\'DROP TABLE temp_table\');');
console.log('alasql(\'DROP VIEW order_summary\');');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 创建内存表
  console.log('\n[步骤 1] 创建表并插入数据:');

  alasql('CREATE TABLE customers');
  [
    { id: 1, name: '张三', city: '北京' },
    { id: 2, name: '李四', city: '上海' },
    { id: 3, name: '王五', city: '广州' }
  ].forEach(c => alasql('INSERT INTO customers VALUES ?', [c]));
  console.log('✓ customers 表: 3 条记录');

  alasql('CREATE TABLE orders');
  [
    { id: 1, customer_id: 1, product: '电脑', amount: 5000, date: '2024-01-15' },
    { id: 2, customer_id: 1, product: '鼠标', amount: 100, date: '2024-01-16' },
    { id: 3, customer_id: 2, product: '键盘', amount: 200, date: '2024-01-17' },
    { id: 4, customer_id: 3, product: '显示器', amount: 1500, date: '2024-01-18' }
  ].forEach(o => alasql('INSERT INTO orders VALUES ?', [o]));
  console.log('✓ orders 表: 4 条记录');

  // JOIN 查询
  console.log('\n[步骤 2] JOIN 查询:');
  const joined = alasql(`
    SELECT
      c.name as customer_name,
      c.city,
      o.product,
      o.amount,
      o.date
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    ORDER BY o.date DESC
  `);

  joined.forEach(row => {
    console.log(`  ${row.customer_name} (${row.city}) - ${row.product}: ¥${row.amount}`);
  });

  // 聚合查询
  console.log('\n[步骤 3] 聚合统计:');
  const summary = alasql(`
    SELECT
      c.name,
      c.city,
      COUNT(o.id) as order_count,
      SUM(o.amount) as total_amount
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.id, c.name, c.city
    ORDER BY total_amount DESC
  `);

  console.log('\n客户统计:');
  summary.forEach(row => {
    console.log(`  ${row.name} (${row.city})`);
    console.log(`    订单数: ${row.order_count}`);
    console.log(`    总金额: ¥${row.total_amount}`);
  });

  // 创建视图
  console.log('\n[步骤 4] 创建视图:');
  alasql(`
    CREATE VIEW customer_summary AS
    SELECT
      c.id,
      c.name,
      COUNT(o.id) as order_count,
      SUM(o.amount) as total
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    GROUP BY c.id, c.name
  `);
  console.log('✓ 视图已创建: customer_summary');

  const viewData = alasql('SELECT * FROM customer_summary WHERE order_count > 0');
  console.log('  视图数据:', viewData.length, '行');

  // 清理
  console.log('\n[步骤 5] 清理表:');
  alasql('DROP TABLE customers');
  alasql('DROP TABLE orders');
  alasql('DROP VIEW customer_summary');
  console.log('✓ 表已删除，内存已释放');

} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('使用场景');
console.log('='.repeat(60));
console.log('✓ 多表关联分析');
console.log('✓ 复杂业务逻辑查询');
console.log('✓ 数据聚合和统计');
console.log('✓ 临时数据计算');
console.log('✓ ETL 中间数据处理');
console.log('✓ 报表数据准备');
