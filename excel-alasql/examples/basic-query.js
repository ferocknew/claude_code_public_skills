/**
 * Basic AlaSQL Excel Query Example
 *
 * This example demonstrates how to:
 * 1. Read an Excel file
 * 2. Filter data with SQL
 * 3. Perform aggregations
 * 4. Save results to a new Excel file
 */

const alasql = require('alasql');

// Example: Analyze sales data from Excel file

// 1. Read the entire Excel file
console.log('Reading sales data...');
const salesData = alasql('SELECT * FROM XLSX("sales_data.xlsx")');
console.log(`Loaded ${salesData.length} records`);

// 2. Filter data - Get sales over $1000
console.log('\nFiltering high-value sales...');
const highValueSales = alasql(`
  SELECT *
  FROM XLSX("sales_data.xlsx")
  WHERE total_amount > 1000
`);
console.log(`Found ${highValueSales.length} high-value sales`);

// 3. Aggregate by category
console.log('\nAggregating sales by category...');
const byCategory = alasql(`
  SELECT
    category,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as average_order_value
  FROM XLSX("sales_data.xlsx")
  GROUP BY category
  ORDER BY total_revenue DESC
`);
console.log('Category summary:');
byCategory.forEach(cat => {
  console.log(`  ${cat.category}: $${cat.total_revenue.toFixed(2)} (${cat.order_count} orders)`);
});

// 4. Filter by date range
console.log('\nFiltering by date range...');
const recentSales = alasql(`
  SELECT *
  FROM XLSX("sales_data.xlsx")
  WHERE order_date >= '2024-01-01'
  ORDER BY order_date DESC
  LIMIT 10
`);
console.log(`Found ${recentSales.length} recent sales`);

// 5. Save results to new Excel file
console.log('\nSaving results...');
alasql('SELECT * INTO XLSX("sales_report.xlsx", {sheetid: "Summary"}) FROM ?', [byCategory]);
alasql('SELECT * INTO XLSX("sales_report.xlsx", {sheetid: "High Value"}) FROM ?', [highValueSales]);
alasql('SELECT * INTO XLSX("sales_report.xlsx", {sheetid: "Recent"}) FROM ?', [recentSales]);

console.log('\n✓ Report saved to sales_report.xlsx');

// 6. Working with multiple sheets
console.log('\nJoining data from multiple sheets...');

// Create in-memory database
alasql('CREATE TABLE orders FROM XLSX("sales_data.xlsx")');
alasql('CREATE TABLE products FROM XLSX("products.xlsx")');

// Join orders with products
const enrichedOrders = alasql(`
  SELECT
    o.order_id,
    o.order_date,
    o.quantity,
    p.product_name,
    p.category,
    p.unit_price,
    (o.quantity * p.unit_price) as calculated_total
  FROM orders o
  JOIN products p ON o.product_id = p.id
  WHERE o.quantity > 0
`);
console.log(`Joined ${enrichedOrders.length} orders with product details`);

// Save joined data
alasql('SELECT * INTO XLSX("sales_report.xlsx", {sheetid: "Enriched Orders"}) FROM ?', [enrichedOrders]);

console.log('\n✓ All operations completed successfully!');
