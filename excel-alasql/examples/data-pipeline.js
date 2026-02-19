/**
 * Complete ETL Pipeline Example
 *
 * This example shows a complete Extract-Transform-Load pipeline:
 * 1. Extract data from multiple Excel sources
 * 2. Transform and clean the data
 * 3. Load into destination formats
 * 4. Generate validation reports
 */

const alasql = require('alasql');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  inputDir: './input_data',
  outputDir: './output_data',
  reportDir: './reports',
  runDate: new Date().toISOString().split('T')[0]
};

// Ensure output directories exist
[config.outputDir, config.reportDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
});

console.log('='.repeat(60));
console.log(`ETL Pipeline - ${config.runDate}`);
console.log('='.repeat(60));

// ============================================================================
// EXTRACT
// ============================================================================
console.log('\n[1/4] EXTRACT - Loading source data...');

try {
  // Load all source files
  const salesData = alasql('SELECT * FROM XLSX(?)', [path.join(config.inputDir, 'sales.xlsx')]);
  const customersData = alasql('SELECT * FROM CSV(?)', [path.join(config.inputDir, 'customers.csv')]);
  const productsData = alasql('SELECT * FROM XLSX(?)', [path.join(config.inputDir, 'products.xlsx')]);

  console.log(`  ✓ Sales: ${salesData.length} records`);
  console.log(`  ✓ Customers: ${customersData.length} records`);
  console.log(`  ✓ Products: ${productsData.length} records`);

  // ============================================================================
  // TRANSFORM
  // ============================================================================
  console.log('\n[2/4] TRANSFORM - Cleaning and normalizing data...');

  // Transform sales data
  const cleanSales = alasql(`
    SELECT
      COALESCE(order_id, id, OrderID) as order_id,
      CAST(COALESCE(order_date, date, OrderDate) AS DATE) as order_date,
      COALESCE(customer_id, customer, CustomerID) as customer_id,
      COALESCE(product_id, product, ProductID) as product_id,
      CAST(COALESCE(quantity, qty, Quantity) AS NUMBER) as quantity,
      CAST(COALESCE(unit_price, price, UnitPrice) AS NUMBER) as unit_price,
      CAST(COALESCE(total, amount, Total) AS NUMBER) as total_amount,
      ? as source_file
    FROM ?
    WHERE order_id IS NOT NULL
      AND quantity > 0
      AND unit_price >= 0
  `, ['sales.xlsx', salesData]);

  console.log(`  ✓ Cleaned sales: ${cleanSales.length} records`);

  // Validate calculated totals
  const validatedSales = cleanSales.filter(row => {
    const calculated = row.quantity * row.unit_price;
    const diff = Math.abs(calculated - row.total_amount);
    return diff < 0.01; // Allow small rounding differences
  });

  console.log(`  ✓ Validated sales: ${validatedSales.length} records (${cleanSales.length - validatedSales.length} removed)`);

  // Transform customer data
  const cleanCustomers = alasql(`
    SELECT
      COALESCE(customer_id, id) as customer_id,
      TRIM(UPPER(COALESCE(email, Email))) as email,
      TRIM(COALESCE(name, Name, customer_name)) as customer_name,
      COALESCE(segment, Segment, 'UNKNOWN') as segment,
      COALESCE(region, Region, 'UNKNOWN') as region,
      ? as source_file
    FROM ?
    WHERE customer_id IS NOT NULL
      AND email IS NOT NULL
      AND email != ''
      AND email LIKE '%_@__%.%'
  `, ['customers.csv', customersData]);

  console.log(`  ✓ Cleaned customers: ${cleanCustomers.length} records`);

  // Transform product data
  const cleanProducts = alasql(`
    SELECT
      COALESCE(product_id, id) as product_id,
      TRIM(COALESCE(product_name, name, ProductName)) as product_name,
      TRIM(COALESCE(category, Category, 'UNCATEGORIZED')) as category,
      CAST(COALESCE(price, Price, unit_price) AS NUMBER) as price,
      CAST(COALESCE(cost, Cost) AS NUMBER) as cost,
      ? as source_file
    FROM ?
    WHERE product_id IS NOT NULL
  `, ['products.xlsx', productsData]);

  console.log(`  ✓ Cleaned products: ${cleanProducts.length} records`);

  // ============================================================================
  // ENRICH - Add calculated fields
  // ============================================================================
  console.log('\n[3/4] ENRICH - Adding calculated fields...');

  const enrichedSales = alasql(`
    SELECT
      s.*,
      YEAR(s.order_date) as order_year,
      MONTH(s.order_date) as order_month,
      p.product_name,
      p.category as product_category,
      c.customer_name,
      c.segment as customer_segment,
      c.region as customer_region,
      (s.quantity * s.unit_price) as verified_total,
      (s.quantity * p.cost) as cost_of_goods,
      (s.total_amount - (s.quantity * p.cost)) as gross_profit,
      CASE
        WHEN p.price > 0 THEN ((s.total_amount - (s.quantity * p.cost)) / s.total_amount * 100)
        ELSE 0
      END as profit_margin_pct
    FROM ? s
    LEFT JOIN ? p ON s.product_id = p.product_id
    LEFT JOIN ? c ON s.customer_id = c.customer_id
  `, [validatedSales, cleanProducts, cleanCustomers]);

  console.log(`  ✓ Enriched sales: ${enrichedSales.length} records`);

  // ============================================================================
  // LOAD - Save to destination formats
  // ============================================================================
  console.log('\n[4/4] LOAD - Writing output files...');

  // Save as Excel with multiple sheets
  const excelPath = path.join(config.outputDir, `sales_data_${config.runDate}.xlsx`);
  alasql('SELECT * INTO XLSX(?, {sheetid: "Sales"}) FROM ?', [excelPath, enrichedSales]);
  alasql('SELECT * INTO XLSX(?, {sheetid: "Products"}) FROM ?', [excelPath, cleanProducts]);
  alasql('SELECT * INTO XLSX(?, {sheetid: "Customers"}) FROM ?', [excelPath, cleanCustomers]);
  console.log(`  ✓ Excel: ${excelPath}`);

  // Save as JSON
  const jsonPath = path.join(config.outputDir, `sales_data_${config.runDate}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(enrichedSales, null, 2));
  console.log(`  ✓ JSON: ${jsonPath}`);

  // Save as CSV
  const csvPath = path.join(config.outputDir, `sales_data_${config.runDate}.csv`);
  alasql('SELECT * INTO CSV(?) FROM ?', [csvPath, enrichedSales]);
  console.log(`  ✓ CSV: ${csvPath}`);

  // ============================================================================
  // REPORTS - Generate summary reports
  // ============================================================================
  console.log('\n[0/1] Generating summary reports...');

  // Overall statistics
  const stats = {
    run_date: config.runDate,
    input: {
      sales_records: salesData.length,
      customer_records: customersData.length,
      product_records: productsData.length
    },
    output: {
      sales_records: enrichedSales.length,
      customer_records: cleanCustomers.length,
      product_records: cleanProducts.length
    },
    removed: {
      sales: salesData.length - enrichedSales.length,
      customers: customersData.length - cleanCustomers.length
    }
  };

  // Revenue metrics
  const revenueMetrics = alasql(`
    SELECT
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_order_value,
      SUM(gross_profit) as total_profit,
      AVG(profit_margin_pct) as avg_margin_pct,
      MIN(order_date) as first_order,
      MAX(order_date) as last_order
    FROM ?
  `, [enrichedSales])[0];

  stats.metrics = revenueMetrics;

  // Save statistics
  const statsPath = path.join(config.reportDir, `etl_stats_${config.runDate}.json`);
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`  ✓ Statistics: ${statsPath}`);

  // Sales by segment
  const bySegment = alasql(`
    SELECT
      customer_segment,
      COUNT(*) as order_count,
      SUM(total_amount) as revenue,
      SUM(gross_profit) as profit,
      AVG(profit_margin_pct) as margin_pct
    FROM ?
    GROUP BY customer_segment
    ORDER BY revenue DESC
  `, [enrichedSales]);

  const segmentPath = path.join(config.reportDir, `sales_by_segment_${config.runDate}.xlsx`);
  alasql('SELECT * INTO XLSX(?) FROM ?', [segmentPath, bySegment]);
  console.log(`  ✓ Segment report: ${segmentPath}`);

  // Top products
  const topProducts = alasql(`
    SELECT
      product_name,
      product_category,
      SUM(quantity) as total_quantity,
      SUM(total_amount) as revenue,
      COUNT(*) as order_count
    FROM ?
    GROUP BY product_name, product_category
    ORDER BY revenue DESC
    LIMIT 20
  `, [enrichedSales]);

  const productsPath = path.join(config.reportDir, `top_products_${config.runDate}.xlsx`);
  alasql('SELECT * INTO XLSX(?) FROM ?', [productsPath, topProducts]);
  console.log(`  ✓ Products report: ${productsPath}`);

  // ============================================================================
  // COMPLETE
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('ETL Pipeline Complete!');
  console.log('='.repeat(60));
  console.log(`\nSummary:`);
  console.log(`  Processed: ${stats.output.sales_records} sales records`);
  console.log(`  Revenue: $${revenueMetrics.total_revenue?.toFixed(2) || 'N/A'}`);
  console.log(`  Profit: $${revenueMetrics.total_profit?.toFixed(2) || 'N/A'}`);
  console.log(`  Margin: ${revenueMetrics.avg_margin_pct?.toFixed(2) || 'N/A'}%`);
  console.log(`\nOutput directory: ${config.outputDir}`);
  console.log(`Report directory: ${config.reportDir}`);

} catch (error) {
  console.error('\n✗ ETL Pipeline Failed!');
  console.error(`Error: ${error.message}`);
  console.error(error.stack);

  // Save error log
  const errorLog = {
    date: config.runDate,
    error: error.message,
    stack: error.stack
  };
  const errorPath = path.join(config.reportDir, `error_${config.runDate}.json`);
  fs.writeFileSync(errorPath, JSON.stringify(errorLog, null, 2));
  console.log(`\nError log saved: ${errorPath}`);

  process.exit(1);
}
