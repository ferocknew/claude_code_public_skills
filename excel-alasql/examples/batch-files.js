/**
 * 目录批处理示例
 *
 * 演示如何处理整个目录中的 Excel 文件
 */

const alasql = require('alasql');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('目录批处理示例');
console.log('='.repeat(60));

// 1. 处理目录中的所有 Excel 文件
console.log('\n[1] 处理目录中所有文件:');
console.log('function processDirectory(directory) {');
console.log('  const files = fs.readdirSync(directory);');
console.log('  const excelFiles = files.filter(f =>');
console.log('    f.endsWith(".xlsx") || f.endsWith(".xls")');
console.log('  );');
console.log('  ');
console.log('  excelFiles.forEach(file => {');
console.log('    const fullPath = path.join(directory, file);');
console.log('    console.log(`处理: ${file}`);');
console.log('    const data = alasql(`SELECT * FROM XLSX("${fullPath}")`);');
console.log('    console.log(`  读取 ${data.length} 行`);');
console.log('  });');
console.log('}');

// 2. 递归处理子目录
console.log('\n[2] 递归处理子目录:');
console.log('function processRecursive(directory) {');
console.log('  const items = fs.readdirSync(directory);');
console.log('  ');
console.log('  items.forEach(item => {');
console.log('    const fullPath = path.join(directory, item);');
console.log('    const stats = fs.statSync(fullPath);');
console.log('    ');
console.log('    if (stats.isDirectory()) {');
console.log('      processRecursive(fullPath); // 递归');
console.log('    } else if (item.endsWith(".xlsx")) {');
console.log('      console.log(`处理: ${fullPath}`);');
console.log('      // 处理文件...');
console.log('    }');
console.log('  });');
console.log('}');

// 3. 按文件名模式过滤
console.log('\n[3] 按模式过滤文件:');
console.log('function processByPattern(directory, pattern) {');
console.log('  const files = fs.readdirSync(directory);');
console.log('  const regex = new RegExp(pattern);');
console.log('  ');
console.log('  files.filter(f => regex.test(f)).forEach(file => {');
console.log('    console.log(`处理: ${file}`);');
console.log('    // 处理匹配的文件...');
console.log('  });');
console.log('}');
console.log('');
console.log('// 示例：处理所有包含 "sales" 的文件');
console.log('processByPattern("./data", "sales");');
console.log('');
console.log('// 示例：处理 2024 年的文件');
console.log('processByPattern("./data", "2024");');

// 4. 生成目录统计报告
console.log('\n[4] 生成目录统计报告:');
console.log('function generateDirectoryReport(directory) {');
console.log('  const files = fs.readdirSync(directory);');
console.log('  const excelFiles = files.filter(f => f.endsWith(".xlsx"));');
console.log('  ');
console.log('  const report = [];');
console.log('  excelFiles.forEach(file => {');
console.log('    const fullPath = path.join(directory, file);');
console.log('    const stats = fs.statSync(fullPath);');
console.log('    const data = alasql(`SELECT * FROM XLSX("${fullPath}")`);');
console.log('    ');
console.log('    report.push({');
console.log('      file,');
console.log('      size: (stats.size / 1024).toFixed(2) + " KB",');
console.log('      rows: data.length,');
console.log('      modified: stats.mtime');
console.log('    });');
console.log('  });');
console.log('  ');
console.log('  return report;');
console.log('}');

// 5. 目录间数据迁移
console.log('\n[5] 目录间数据迁移:');
console.log('function migrateDirectory(sourceDir, targetDir) {');
console.log('  const files = fs.readdirSync(sourceDir);');
console.log('  const excelFiles = files.filter(f => f.endsWith(".xlsx"));');
console.log('  ');
console.log('  excelFiles.forEach(file => {');
console.log('    const sourcePath = path.join(sourceDir, file);');
console.log('    const targetPath = path.join(targetDir, file);');
console.log('    ');
console.log('    // 读取、转换并保存到目标目录');
console.log('    const data = alasql(`SELECT * FROM XLSX("${sourcePath}")`);');
console.log('    alasql(`SELECT * INTO XLSX("${targetPath}") FROM ?`, [data]);');
console.log('    console.log(`✓ 已迁移: ${file}`);');
console.log('  });');
console.log('}');

// 6. 按文件大小过滤
console.log('\n[6] 按文件大小过滤:');
console.log('function processBySize(directory, maxSizeMB) {');
console.log('  const files = fs.readdirSync(directory);');
console.log('  const maxSizeBytes = maxSizeMB * 1024 * 1024;');
console.log('  ');
console.log('  files.filter(file => {');
console.log('    const fullPath = path.join(directory, file);');
console.log('    const stats = fs.statSync(fullPath);');
console.log('    return stats.size <= maxSizeBytes;');
console.log('  }).forEach(file => {');
console.log('    console.log(`处理: ${file}`);');
console.log('    // 处理小文件...');
console.log('  });');
console.log('}');

// 7. 并行处理（带限制）
console.log('\n[7] 并行处理（限制并发数）:');
console.log('async function processParallel(files, concurrency = 3) {');
console.log('  for (let i = 0; i < files.length; i += concurrency) {');
console.log('    const batch = files.slice(i, i + concurrency);');
console.log('    await Promise.all(');
console.log('      batch.map(async (file) => {');
console.log('        // 处理文件...');
console.log('        console.log(`处理: ${file}`);');
console.log('      })');
console.log('    );');
console.log('  }');
console.log('}');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 创建测试目录结构
  const testDir = '/tmp/test-excel-batch';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建测试文件
  const testData = [
    { id: 1, name: '项目1', value: 100 },
    { id: 2, name: '项目2', value: 200 }
  ];

  for (let i = 1; i <= 3; i++) {
    const filePath = path.join(testDir, `data${i}.xlsx`);
    alasql('SELECT * INTO XLSX("' + filePath + '") FROM ?', [testData]);
  }

  console.log('✓ 已创建测试文件到:', testDir);

  // 列出目录内容
  console.log('\n目录内容:');
  const files = fs.readdirSync(testDir);
  files.forEach(file => {
    const fullPath = path.join(testDir, file);
    const stats = fs.statSync(fullPath);
    console.log(`  ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
  });

  // 批量处理
  console.log('\n批量处理:');
  const excelFiles = files.filter(f => f.endsWith('.xlsx'));

  let totalRows = 0;
  excelFiles.forEach(file => {
    const fullPath = path.join(testDir, file);
    const data = alasql(`SELECT * FROM XLSX("${fullPath}")`);
    console.log(`  ${file}: ${data.length} 行`);
    totalRows += data.length;
  });

  console.log(`\n总计: ${totalRows} 行数据`);

  // 生成报告
  const report = [];
  excelFiles.forEach(file => {
    const fullPath = path.join(testDir, file);
    const stats = fs.statSync(fullPath);
    const data = alasql(`SELECT * FROM XLSX("${fullPath}")`);

    report.push({
      file,
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      rows: data.length
    });
  });

  // 保存报告
  alasql('SELECT * INTO XLSX("/tmp/batch-report.xlsx") FROM ?', [report]);
  console.log('\n✓ 报告已保存: /tmp/batch-report.xlsx');

} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('最佳实践');
console.log('='.repeat(60));
console.log('1. 处理前检查目录是否存在');
console.log('2. 过滤不需要的文件（扩展名、大小、名称模式）');
console.log('3. 记录处理日志（成功/失败）');
console.log('4. 使用 try-catch 处理单个文件错误');
console.log('5. 大量文件考虑限制并发数量');
console.log('6. 处理完成后生成统计报告');
