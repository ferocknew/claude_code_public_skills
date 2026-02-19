/**
 * 错误处理示例
 *
 * 演示如何处理 AlaSQL 中的各种错误
 */

const alasql = require('alasql');
const fs = require('fs');

console.log('='.repeat(60));
console.log('错误处理示例');
console.log('='.repeat(60));

// 1. 基本错误捕获
console.log('\n[1] 基本错误捕获（文件不存在）:');
console.log('try {');
console.log('  const data = alasql(\'SELECT * FROM XLSX("missing.xlsx")\');');
console.log('} catch (error) {');
console.log('  console.error(\'读取文件错误:\', error.message);');
console.log('  // 处理错误');
console.log('}');

// 2. 检查空结果
console.log('\n[2] 检查空结果:');
console.log('const result = alasql(\'SELECT * FROM XLSX("data.xlsx")\');');
console.log('if (!result || result.length === 0) {');
console.log('  console.log(\'未找到数据\');');
console.log('} else {');
console.log('  console.log(\'找到\', result.length, \'行数据\');');
console.log('}');

// 3. 验证文件存在
console.log('\n[3] 验证文件存在:');
console.log('function readExcelSafe(filePath) {');
console.log('  if (!fs.existsSync(filePath)) {');
console.log('    throw new Error(`文件不存在: ${filePath}`);');
console.log('  }');
console.log('  return alasql(`SELECT * FROM XLSX("${filePath}")`);');
console.log('}');

// 4. 处理中文文件名
console.log('\n[4] 处理中文文件名错误:');
console.log('function safeReadExcel(filePath) {');
console.log('  const fileName = path.basename(filePath);');
console.log('  const hasChinese = /[\\u4e00-\\u9fa5]/.test(fileName);');
console.log('  ');
console.log('  if (hasChinese) {');
console.log('    // 复制到临时文件');
console.log('    const tempFile = `/temp/temp_${Date.now()}.xlsx`;');
console.log('    fs.copyFileSync(filePath, tempFile);');
console.log('    try {');
console.log('      const data = alasql(`SELECT * FROM XLSX("${tempFile}")`);');
console.log('      fs.unlinkSync(tempFile);');
console.log('      return data;');
console.log('    } catch (e) {');
console.log('      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);');
console.log('      throw e;');
console.log('    }');
console.log('  }');
console.log('  return alasql(`SELECT * FROM XLSX("${filePath}")`);');
console.log('}');

// 5. 处理类型错误
console.log('\n[5] 处理类型转换错误:');
console.log('const result = alasql(`');
console.log('  SELECT');
console.log('    CASE');
console.log('      WHEN ISNUMERIC(price) THEN CAST(price AS NUMBER)');
console.log('      ELSE 0');
console.log('    END as price');
console.log('  FROM XLSX("data.xlsx")');
console.log('`);');

// 6. 处理空值
console.log('\n[6] 处理空值:');
console.log('const result = alasql(`');
console.log('  SELECT');
console.log('    COALESCE(email, \'无邮箱\') as email,');
console.log('    COALESCE(phone, \'无电话\') as phone');
console.log('  FROM XLSX("users.xlsx")');
console.log('`);');

// 7. 数据验证
console.log('\n[7] 数据验证（检查必需字段）:');
console.log('function validateData(data, requiredFields) {');
console.log('  const errors = [];');
console.log('  data.forEach((row, idx) => {');
console.log('    requiredFields.forEach(field => {');
console.log('      if (!row[field]) {');
console.log('        errors.push(`行 ${idx + 1}: 缺少字段 ${field}`);');
console.log('      }');
console.log('    });');
console.log('  });');
console.log('  return errors;');
console.log('}');

// 8. 事务处理（模拟）
console.log('\n[8] 批量操作错误处理:');
console.log('async function batchProcess(files) {');
console.log('  const results = [];');
console.log('  const errors = [];');
console.log('  ');
console.log('  for (const file of files) {');
console.log('    try {');
console.log('      const data = alasql(`SELECT * FROM XLSX("${file}")`);');
console.log('      results.push({ file, count: data.length });');
console.log('    } catch (error) {');
console.log('      errors.push({ file, error: error.message });');
console.log('    }');
console.log('  }');
console.log('  ');
console.log('  return { results, errors };');
console.log('}');

// 实际示例
try {
  console.log('\n' + '='.repeat(60));
  console.log('实际运行示例');
  console.log('='.repeat(60));

  // 示例1: 检查文件存在
  console.log('\n[示例 1] 检查文件存在:');
  const testFile = '/tmp/test.xlsx';
  if (fs.existsSync(testFile)) {
    console.log(`✓ 文件存在: ${testFile}`);
  } else {
    console.log(`✗ 文件不存在: ${testFile}`);
  }

  // 示例2: 安全读取
  console.log('\n[示例 2] 安全读取函数:');
  function safeReadExcel(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    try {
      return alasql(`SELECT * FROM XLSX("${filePath}")`);
    } catch (error) {
      throw new Error(`读取失败: ${error.message}`);
    }
  }

  // 示例3: 数据验证
  console.log('\n[示例 3] 数据验证:');
  const testData = [
    { name: '张三', age: 30 },
    { name: '', age: 25 },  // 缺少 name
    { age: 35 }             // 缺少 name
  ];

  function validateData(data, requiredFields) {
    const errors = [];
    data.forEach((row, idx) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`行 ${idx + 1}: 缺少字段 ${field}`);
        }
      });
    });
    return errors;
  }

  const validationErrors = validateData(testData, ['name']);
  if (validationErrors.length > 0) {
    console.log('✗ 数据验证失败:');
    validationErrors.forEach(err => console.log('  -', err));
  } else {
    console.log('✓ 数据验证通过');
  }

} catch (error) {
  console.error('错误:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('最佳实践');
console.log('='.repeat(60));
console.log('1. 始终使用 try-catch 包裹文件操作');
console.log('2. 检查文件是否存在再读取');
console.log('3. 验证返回数据的完整性');
console.log('4. 处理空值和类型转换错误');
console.log('5. 批量操作时记录成功和失败');
console.log('6. 中文文件名使用临时文件方案');
console.log('7. 使用 COALESCE 处理 NULL 值');
