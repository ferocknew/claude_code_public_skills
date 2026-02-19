/**
 * 中文文件名处理示例
 *
 * AlaSQL 完全支持中文文件名，无需特殊处理！
 *
 * 更新说明：
 * - AlaSQL + SheetJS 集成已完全支持中文
 * - 可以直接读取中文文件名，无需复制临时文件
 * - 中文列名也可以正常使用
 */

const { promise: alasql } = require('alasql');
const fs = require('fs');

console.log('='.repeat(60));
console.log('中文文件名处理示例');
console.log('='.repeat(60));

/**
 * 检测文件名是否包含中文
 */
function hasChinese(fileName) {
  return /[\u4e00-\u9fa5]/.test(fileName);
}

/**
 * 读取 Excel 文件（支持中文文件名）
 * @param {string} filePath - 文件路径
 * @returns {Promise<Array>} 数据数组
 */
async function readExcel(filePath) {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const fileName = filePath.split('/').pop();

  if (hasChinese(fileName)) {
    console.log(`✓ 中文文件名: ${fileName}`);
  } else {
    console.log(`✓ 英文文件名: ${fileName}`);
  }

  // 直接读取，无需任何特殊处理
  const data = await alasql(
    `SELECT * FROM XLSX("${filePath}", {autoExt: false})`
  );

  return data;
}

// 使用示例
console.log('\n[1] 直接读取中文文件名:');
console.log('const data = await readExcel("数据.xlsx");');

console.log('\n[2] 批量处理中文文件:');
console.log('const files = ["数据.xlsx", "报表.xlsx", "故障树.xlsx"];');
console.log('for (const file of files) {');
console.log('  const data = await readExcel(`./excel/${file}`);');
console.log('  console.log(`${file}: ${data.length} 行`);');
console.log('}');

// 实际示例
(async() => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('实际运行示例');
    console.log('='.repeat(60));

    // 测试中文文件名检测
    const testNames = [
      'data.xlsx',
      '数据.xlsx',
      'sales-2024.xlsx',
      '故障树分析.xlsx'
    ];

    console.log('\n中文文件名检测:');
    testNames.forEach(name => {
      const hasCN = hasChinese(name);
      console.log(`  ${name.padEnd(20)} ${hasCN ? '✓ 包含中文' : '✗ 无中文'}`);
    });

    // 读取实际的中文文件名文件
    const chineseFile = '/data/excel/故障树.xlsx';
    if (fs.existsSync(chineseFile)) {
      console.log('\n读取实际中文文件:');
      const data = await readExcel(chineseFile);
      console.log(`✓ 成功读取 ${data.length} 行数据`);
      console.log(`  列名: ${Object.keys(data[0]).join(', ')}`);

      // 演示中文列名的使用
      console.log('\n使用中文列名查询:');
      const stats = {};
      data.forEach(row => {
        const level = row['层次'];
        stats[level] = (stats[level] || 0) + 1;
      });
      Object.entries(stats).forEach(([key, val]) => {
        console.log(`  ${key}: ${val} 个`);
      });
    }

  } catch (error) {
    console.error('错误:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('总结');
  console.log('='.repeat(60));
  console.log('✓ AlaSQL 完全支持中文文件名');
  console.log('✓ 中文列名可以正常使用');
  console.log('✓ 无需复制临时文件');
  console.log('✓ 直接使用 Promise 方式读取即可');
  console.log('\n推荐代码:');
  console.log('  const { promise: alasql } = require("alasql");');
  console.log('  const data = await alasql(');
  console.log('    \'SELECT * FROM XLSX("中文文件.xlsx", {autoExt: false})');
  console.log('  );');
})();
