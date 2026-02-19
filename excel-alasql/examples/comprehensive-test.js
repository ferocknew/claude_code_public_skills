#!/usr/bin/env -S npx -y -p alasql@1.7.3 -p xlsx node
/**
 * 综合测试 - Excel 数据各种搜索和查询
 *
 * 测试 /data/excel/故障树.xlsx 的各种操作
 */

const { promise: alasql } = require("alasql");
const fs = require('fs');

const excelFile = '/data/excel/故障树.xlsx';

console.log('='.repeat(70));
console.log('AlaSQL Excel 数据综合测试 - version 2.0.0');
console.log('='.repeat(70));
console.log(`文件: ${excelFile}`);
console.log('');

(async() => {
  try {
    // 1. 读取数据
    console.log('[1/10] 读取 Excel 文件...');
    const data = await alasql(
      `SELECT * FROM XLSX("${excelFile}", {autoExt: false})`
    );
    console.log(`✓ 读取成功: ${data.length} 行, ${Object.keys(data[0]).length} 列`);
    console.log(`  列名: ${Object.keys(data[0]).join(', ')}\n`);

    // 2. 全文搜索 - 搜索包含特定关键词的行
    console.log('[2/10] 全文搜索 - 查找包含 "MCU" 的记录...');
    const searchMCU = data.filter(row =>
      Object.values(row).some(val =>
        String(val).includes('MCU')
      )
    );
    console.log(`✓ 找到 ${searchMCU.length} 条包含 "MCU" 的记录`);
    searchMCU.forEach(row => {
      console.log(`  - ${row.层次}: ${row.事件编号} - ${row.事件名称}`);
    });
    console.log('');

    // 3. 精确匹配搜索 - 特定字段值
    console.log('[3/10] 精确匹配 - 查找 "层次" 为 "中间事件" 的记录...');
    const midEvents = data.filter(row => row['层次'] === '中间事件');
    console.log(`✓ 找到 ${midEvents.length} 个中间事件`);
    midEvents.forEach(row => {
      console.log(`  - ${row.事件编号}: ${row.事件名称}`);
    });
    console.log('');

    // 4. 多条件组合搜索
    console.log('[4/10] 多条件搜索 - "中间事件" 且名称包含 "模块"...');
    const complexSearch = data.filter(row =>
      row['层次'] === '中间事件' &&
      row['事件名称'].includes('模块')
    );
    console.log(`✓ 找到 ${complexSearch.length} 条匹配记录`);
    complexSearch.forEach(row => {
      console.log(`  - ${row.事件编号}: ${row.事件名称}`);
      console.log(`    ${row.故障原因说明.substring(0, 40)}...`);
    });
    console.log('');

    // 5. SQL LIKE 模糊搜索
    console.log('[5/10] SQL 查询 - 查找 "事件名称" 包含 "故障" 的记录...');
    const likeResults = data.filter(row =>
      row['事件名称'] && row['事件名称'].includes('故障')
    );
    console.log(`✓ 找到 ${likeResults.length} 条记录`);
    console.log('');

    // 6. 正则表达式搜索
    console.log('[6/10] 正则表达式搜索 - 事件编号以 "M" 开头...');
    const regexResults = data.filter(row =>
      /^M\d+$/.test(row['事件编号'])
    );
    console.log(`✓ 找到 ${regexResults.length} 条记录`);
    console.log('');

    // 7. 数值范围搜索
    console.log('[7/10] 排序搜索 - 按 "事件编号" 排序...');
    const sorted = [...data].sort((a, b) =>
      a['事件编号'].localeCompare(b['事件编号'])
    );
    console.log(`✓ 前5条记录:`);
    sorted.slice(0, 5).forEach(row => {
      console.log(`  ${row.事件编号} - ${row.层次} - ${row.事件名称.substring(0, 30)}`);
    });
    console.log('');

    // 8. 聚合统计（用 JavaScript 实现，因为 AlaSQL 不支持中文列名）
    console.log('[8/10] 聚合统计 - 按 "层次" 分组统计...');
    const stats = {};
    data.forEach(row => {
      const level = row['层次'];
      stats[level] = (stats[level] || 0) + 1;
    });
    Object.entries(stats).forEach(([key, val]) => {
      console.log(`  ${key}: ${val} 个`);
    });
    console.log('');

    // 9. 顶层筛选 - 只返回特定字段
    console.log('[9/10] 字段投影 - 只返回关键信息...');
    const projected = data
      .filter(row => row['层次'] === '中间事件')
      .map(row => ({
        事件编号: row['事件编号'],
        事件名称: row['事件名称'],
        故障原因说明: row['故障原因说明']
      }));
    console.log(`✓ 返回 ${projected.length} 条记录（仅3个字段）`);
    projected.slice(0, 3).forEach(row => {
      console.log(`  ${row.事件编号}: ${row.事件名称}`);
    });
    console.log('');

    // 10. 去重搜索
    console.log('[10/10] 去重搜索 - 所有不重复的 "逻辑门类型"...');
    const uniqueGates = [...new Set(data.map(row => row['逻辑门类型']))];
    console.log(`✓ 找到 ${uniqueGates.length} 种逻辑门类型:`);
    uniqueGates.forEach(gate => {
      const count = data.filter(row => row['逻辑门类型'] === gate).length;
      console.log(`  - ${gate}: ${count} 个`);
    });
    console.log('');

    console.log('='.repeat(70));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(70));
    console.log('\n总结:');
    console.log(`  总记录数: ${data.length}`);
    console.log(`  顶层事件: ${data.filter(r => r.层次 === '顶事件').length}`);
    console.log(`  中间事件: ${data.filter(r => r.层次 === '中间事件').length}`);
    console.log(`  基本事件: ${data.filter(r => r.层次 === '基本事件').length}`);
    console.log(`  逻辑门类型: ${uniqueGates.length} 种`);

  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
  }
})();
