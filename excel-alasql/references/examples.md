# Advanced AlaSQL Examples

Real-world examples of complex data processing with AlaSQL.

## Example 1: Sales Report Dashboard

Complete sales analysis with multiple aggregations.

```javascript
const alasql = require('alasql');

// Load data
alasql('CREATE TABLE orders FROM XLSX("orders.xlsx")');
alasql('CREATE TABLE products FROM XLSX("products.xlsx")');
alasql('CREATE TABLE customers FROM XLSX("customers.xlsx")');

// Executive summary
const summary = alasql(`
  SELECT
    COUNT(*) as total_orders,
    SUM(amount) as total_revenue,
    AVG(amount) as avg_order_value,
    MIN(order_date) as first_order,
    MAX(order_date) as last_order
  FROM orders
`);

// Sales by category
const byCategory = alasql(`
  SELECT
    p.category,
    COUNT(*) as order_count,
    SUM(o.amount) as revenue,
    AVG(o.amount) as avg_order,
    MIN(o.amount) as min_order,
    MAX(o.amount) as max_order
  FROM orders o
  JOIN products p ON o.product_id = p.id
  GROUP BY p.category
  ORDER BY revenue DESC
`);

// Top customers
const topCustomers = alasql(`
  SELECT
    c.name,
    c.email,
    COUNT(o.id) as total_orders,
    SUM(o.amount) as total_spent,
    AVG(o.amount) as avg_order_value
  FROM customers c
  JOIN orders o ON c.id = o.customer_id
  GROUP BY c.id, c.name, c.email
  ORDER BY total_spent DESC
  LIMIT 10
`);

// Monthly trend
const monthlyTrend = alasql(`
  SELECT
    YEAR(order_date) as year,
    MONTH(order_date) as month,
    COUNT(*) as order_count,
    SUM(amount) as revenue
  FROM orders
  GROUP BY YEAR(order_date), MONTH(order_date)
  ORDER BY year, month
`);

// Save all reports
alasql('SELECT * INTO XLSX("reports/summary.xlsx", {sheetid: "Summary"}) FROM ?', [summary]);
alasql('SELECT * INTO XLSX("reports/summary.xlsx", {sheetid: "By Category"}) FROM ?', [byCategory]);
alasql('SELECT * INTO XLSX("reports/summary.xlsx", {sheetid: "Top Customers"}) FROM ?', [topCustomers]);
alasql('SELECT * INTO XLSX("reports/summary.xlsx", {sheetid: "Monthly Trend"}) FROM ?', [monthlyTrend]);

console.log('Reports generated successfully!');
```

## Example 2: Data Quality Validation

Check data quality issues across multiple files.

```javascript
const alasql = require('alasql');
const fs = require('fs');

// Load data
const data = alasql('SELECT * FROM XLSX("customer_data.xlsx")');

// Validation checks
const issues = [];

// 1. Check for null values in required fields
const nullEmails = alasql(`
  SELECT id, name
  FROM ?
  WHERE email IS NULL OR email = ''
`, [data]);
if (nullEmails.length > 0) {
  issues.push({type: 'NULL_EMAIL', count: nullEmails.length, details: nullEmails});
}

// 2. Check for duplicate emails
const duplicates = alasql(`
  SELECT email, COUNT(*) as count
  FROM ?
  WHERE email IS NOT NULL AND email != ''
  GROUP BY email
  HAVING COUNT(*) > 1
`, [data]);
if (duplicates.length > 0) {
  issues.push({type: 'DUPLICATE_EMAIL', count: duplicates.length, details: duplicates});
}

// 3. Validate email format
const invalidEmails = alasql(`
  SELECT id, email
  FROM ?
  WHERE email IS NOT NULL
    AND email != ''
    AND email NOT LIKE '%_@__%.__%'
`, [data]);
if (invalidEmails.length > 0) {
  issues.push({type: 'INVALID_EMAIL_FORMAT', count: invalidEmails.length, details: invalidEmails});
}

// 4. Check for negative values
const negativeValues = alasql(`
  SELECT id, balance
  FROM ?
  WHERE balance < 0
`, [data]);
if (negativeValues.length > 0) {
  issues.push({type: 'NEGATIVE_BALANCE', count: negativeValues.length, details: negativeValues});
}

// 5. Check for future dates
const futureDates = alasql(`
  SELECT id, created_date
  FROM ?
  WHERE created_date > NOW()
`, [data]);
if (futureDates.length > 0) {
  issues.push({type: 'FUTURE_DATE', count: futureDates.length, details: futureDates});
}

// Generate report
if (issues.length > 0) {
  console.log('Data Quality Issues Found:');
  issues.forEach(issue => {
    console.log(`\n${issue.type}: ${issue.count} records`);
    // Save details to separate files
    alasql(`SELECT * INTO XLSX("reports/${issue.type}.xlsx") FROM ?`, [issue.details]);
  });
} else {
  console.log('No data quality issues found!');
}

// Save summary
alasql('SELECT * INTO XLSX("reports/validation_summary.xlsx") FROM ?', [issues]);
```

## Example 3: ETL Pipeline - Excel to Database

Extract, Transform, Load pipeline.

```javascript
const alasql = require('alasql');
const fs = require('fs');

// EXTRACT: Read from multiple sources
const salesData = alasql('SELECT * FROM XLSX("source/sales.xlsx")');
const productData = alasql('SELECT * FROM XLSX("source/products.xlsx")');
const customerData = alasql('SELECT * FROM CSV("source/customers.csv")');

// TRANSFORM: Clean and normalize

// Normalize column names
const cleanSales = salesData.map(row => ({
  order_id: row.OrderID || row.order_id,
  date: new Date(row.OrderDate || row.date),
  customer_id: parseInt(row.CustomerID || row.customer_id),
  product_id: parseInt(row.ProductID || row.product_id),
  quantity: parseInt(row.Quantity || row.quantity),
  unit_price: parseFloat(row.UnitPrice || row.unit_price),
  total: parseFloat(row.Total || row.total)
}));

// Add calculated fields
const enrichedSales = alasql(`
  SELECT
    *,
    (quantity * unit_price) as calculated_total,
    UPPER(category) as category_upper,
    YEAR(date) as year,
    MONTH(date) as month
  FROM ?
`, [cleanSales]);

// Remove duplicates
const uniqueSales = alasql(`
  SELECT DISTINCT *
  FROM ?
  ORDER BY order_id
`, [enrichedSales]);

// Filter out invalid records
const validSales = alasql(`
  SELECT *
  FROM ?
  WHERE order_id IS NOT NULL
    AND quantity > 0
    AND unit_price >= 0
    AND calculated_total = total
`, [uniqueSales]);

// LOAD: Save to destination formats

// Save as Excel (multiple sheets)
alasql('SELECT * INTO XLSX("output/sales_clean.xlsx", {sheetid: "Orders"}) FROM ?', [validSales]);
alasql('SELECT * INTO XLSX("output/sales_clean.xlsx", {sheetid: "Products"}) FROM ?', [productData]);
alasql('SELECT * INTO XLSX("output/sales_clean.xlsx", {sheetid: "Customers"}) FROM ?', [customerData]);

// Save as JSON
fs.writeFileSync('output/sales.json', JSON.stringify(validSales, null, 2));

// Save as CSV (for import into database)
alasql('SELECT * INTO CSV("output/sales_for_db.csv") FROM ?', [validSales]);

// Generate statistics
const stats = {
  total_records: salesData.length,
  cleaned_records: validSales.length,
  removed_records: salesData.length - validSales.length,
  date_range: {
    start: alasql('SELECT MIN(date) as min_date FROM ?', [validSales])[0].min_date,
    end: alasql('SELECT MAX(date) as max_date FROM ?', [validSales])[0].max_date
  },
  total_value: alasql('SELECT SUM(total) as sum FROM ?', [validSales])[0].sum
};

fs.writeFileSync('output/etl_stats.json', JSON.stringify(stats, null, 2));

console.log('ETL Pipeline Complete!');
console.log(`Processed ${stats.total_records} records`);
console.log(`Output: ${stats.cleaned_records} valid records`);
console.log(`Removed: ${stats.removed_records} invalid records`);
```

## Example 4: Financial Analysis

Portfolio analysis with complex calculations.

```javascript
const alasql = require('alasql');

// Load transactions and holdings
const transactions = alasql('SELECT * FROM XLSX("transactions.xlsx")');
const holdings = alasql('SELECT * FROM XLSX("holdings.xlsx")');
const prices = alasql('SELECT * FROM XLSX("current_prices.xlsx")');

// Calculate portfolio value
const portfolioValue = alasql(`
  SELECT
    h.symbol,
    h.shares,
    p.current_price,
    (h.shares * p.current_price) as market_value,
    h.cost_basis,
    ((h.shares * p.current_price) - h.cost_basis) as unrealized_gain_loss,
    (((h.shares * p.current_price) - h.cost_basis) / h.cost_basis * 100) as return_percentage
  FROM holdings h
  JOIN prices p ON h.symbol = p.symbol
`);

// Portfolio allocation
const allocation = alasql(`
  SELECT
    symbol,
    market_value,
    (market_value / SUM(market_value) OVER () * 100) as portfolio_percentage
  FROM ?
`, [portfolioValue]);

// Sector breakdown
const sectorBreakdown = alasql(`
  SELECT
    h.sector,
    SUM(h.shares * p.current_price) as sector_value,
    SUM(h.shares * p.current_price) / SUM(SUM(h.shares * p.current_price)) OVER () * 100 as allocation
  FROM holdings h
  JOIN prices p ON h.symbol = p.symbol
  GROUP BY h.sector
  ORDER BY sector_value DESC
`);

// Performance by ticker
const performance = alasql(`
  SELECT
    t.symbol,
    MIN(t.execution_date) as first_purchase,
    MAX(t.execution_date) as last_purchase,
    SUM(CASE WHEN t.action = 'BUY' THEN t.shares ELSE 0 END) as total_bought,
    SUM(CASE WHEN t.action = 'SELL' THEN t.shares ELSE 0 END) as total_sold,
    SUM(t.amount) as total_invested,
    (h.shares * p.current_price) as current_value
  FROM transactions t
  JOIN holdings h ON t.symbol = h.symbol
  JOIN prices p ON t.symbol = p.symbol
  GROUP BY t.symbol
  ORDER BY current_value DESC
`);

// Generate report
alasql('SELECT * INTO XLSX("reports/portfolio.xlsx", {sheetid: "Holdings"}) FROM ?', [portfolioValue]);
alasql('SELECT * INTO XLSX("reports/portfolio.xlsx", {sheetid: "Allocation"}) FROM ?', [allocation]);
alasql('SELECT * INTO XLSX("reports/portfolio.xlsx", {sheetid: "Sectors"}) FROM ?', [sectorBreakdown]);
alasql('SELECT * INTO XLSX("reports/portfolio.xlsx", {sheetid: "Performance"}) FROM ?', [performance]);

console.log('Portfolio analysis complete!');
```

## Example 5: Data Merging from Multiple Sources

Combine data from various Excel files with different structures.

```javascript
const alasql = require('alasql');
const fs = require('fs');

// Define file sources
const sources = [
  {file: 'sales_jan.xlsx', sheet: 'Sheet1', month: 'January'},
  {file: 'sales_feb.xlsx', sheet: 'Data', month: 'February'},
  {file: 'sales_mar.xlsx', sheet: 'Sales', month: 'March'},
  {file: 'sales_q1.csv', format: 'csv', month: 'Q1 Total'}
];

// Standardize and merge all data
const allData = [];

sources.forEach(source => {
  let data;

  // Read based on format
  if (source.format === 'csv') {
    data = alasql('SELECT * FROM CSV(?)', [source.file]);
  } else {
    data = alasql('SELECT * FROM XLSX(?, {sheetid: ?})', [source.file, source.sheet]);
  }

  // Standardize column names
  const standardized = alasql(`
    SELECT
      COALESCE(Order_ID, order_id, OrderID, id) as order_id,
      COALESCE(Date, date, Order_Date, order_date) as date,
      COALESCE(Customer, customer, Customer_Name, customer_name) as customer,
      COALESCE(Product, product, Product_Name, product_name) as product,
      COALESCE(Category, category, product_category) as category,
      COALESCE(Quantity, quantity, Qty) as quantity,
      COALESCE(Price, price, Unit_Price) as price,
      COALESCE(Total, total, Amount) as total,
      ? as source_file,
      ? as month
    FROM ?
  `, [source.file, source.month, data]);

  allData.push(...standardized);
});

// Clean and validate merged data
const cleanedData = alasql(`
  SELECT
    order_id,
    date,
    customer,
    product,
    category,
    CAST(quantity AS NUMBER) as quantity,
    CAST(price AS NUMBER) as price,
    CAST(total AS NUMBER) as total,
    source_file,
    month,
    (quantity * price) as calculated_total
  FROM ?
  WHERE order_id IS NOT NULL
    AND quantity > 0
    AND price >= 0
`, [allData]);

// Analyze merged data
const byMonth = alasql(`
  SELECT
    month,
    COUNT(*) as order_count,
    SUM(total) as revenue,
    AVG(total) as avg_order
  FROM ?
  GROUP BY month
  ORDER BY month
`, [cleanedData]);

const byProduct = alasql(`
  SELECT
    product,
    category,
    SUM(quantity) as total_quantity,
    SUM(total) as total_revenue,
    COUNT(*) as order_count
  FROM ?
  GROUP BY product, category
  ORDER BY total_revenue DESC
`, [cleanedData]);

// Save consolidated report
alasql('SELECT * INTO XLSX("reports/consolidated.xlsx", {sheetid: "All Data"}) FROM ?', [cleanedData]);
alasql('SELECT * INTO XLSX("reports/consolidated.xlsx", {sheetid: "By Month"}) FROM ?', [byMonth]);
alasql('SELECT * INTO XLSX("reports/consolidated.xlsx", {sheetid: "By Product"}) FROM ?', [byProduct]);

console.log(`Merged ${sources.length} files with ${cleanedData.length} total records`);
```

## Example 6: Automated Reporting System

Generate scheduled reports from Excel data sources.

```javascript
const alasql = require('alasql');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  inputDir: './data',
  outputDir: './reports',
  date: new Date().toISOString().split('T')[0]
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, {recursive: true});
}

// Report definitions
const reports = [
  {
    name: 'Daily Sales',
    file: 'sales.xlsx',
    query: `
      SELECT
        DATE(order_date) as date,
        COUNT(*) as orders,
        SUM(amount) as revenue
      FROM XLSX("${config.inputDir}/sales.xlsx")
      WHERE DATE(order_date) = '${config.date}'
      GROUP BY DATE(order_date)
    `,
    output: `daily_sales_${config.date}.xlsx`
  },
  {
    name: 'Product Performance',
    file: 'sales.xlsx',
    query: `
      SELECT
        p.category,
        p.name,
        COUNT(s.id) as sales_count,
        SUM(s.quantity) as total_quantity,
        SUM(s.amount) as revenue,
        AVG(s.amount) as avg_sale
      FROM XLSX("${config.inputDir}/sales.xlsx") s
      JOIN XLSX("${config.inputDir}/products.xlsx") p ON s.product_id = p.id
      GROUP BY p.category, p.name
      ORDER BY revenue DESC
    `,
    output: `product_performance_${config.date}.xlsx`
  },
  {
    name: 'Customer Summary',
    file: 'customers.xlsx',
    query: `
      SELECT
        c.segment,
        COUNT(*) as customer_count,
        SUM(c.lifetime_value) as total_ltv,
        AVG(c.lifetime_value) as avg_ltv
      FROM XLSX("${config.inputDir}/customers.xlsx") c
      GROUP BY c.segment
    `,
    output: `customer_summary_${config.date}.xlsx`
  }
];

// Generate all reports
const reportResults = [];

reports.forEach(report => {
  try {
    console.log(`Generating: ${report.name}`);
    const result = alasql(report.query);
    const outputPath = path.join(config.outputDir, report.output);
    alasql('SELECT * INTO XLSX(?) FROM ?', [outputPath, result]);

    reportResults.push({
      report: report.name,
      status: 'Success',
      rows: result.length,
      file: report.output
    });
  } catch (error) {
    console.error(`Error generating ${report.name}:`, error.message);
    reportResults.push({
      report: report.name,
      status: 'Failed',
      error: error.message
    });
  }
});

// Save generation log
alasql('SELECT * INTO XLSX(?) FROM ?', [
  path.join(config.outputDir, `generation_log_${config.date}.xlsx`),
  reportResults
]);

console.log('\nReport Generation Complete!');
console.log(`Reports saved to: ${config.outputDir}`);

// Email notification placeholder
// sendEmail({
//   subject: `Daily Reports ${config.date}`,
//   reports: reportResults
// });
```
