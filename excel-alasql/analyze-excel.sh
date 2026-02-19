#!/bin/bash
# Excel 快速分析脚本
# 用法: analyze-excel.sh <文件路径> [查询类型]

EXCEL_FILE="${1:-}"
QUERY_TYPE="${2:-overview}"

if [ -z "$EXCEL_FILE" ]; then
  echo "用法: $0 <Excel文件路径> [查询类型]"
  echo ""
  echo "查询类型:"
  echo "  overview  - 数据概览（默认）"
  echo "  search    - 搜索关键词"
  echo "  filter    - 筛选数据"
  echo "  stats     - 统计分析"
  echo ""
  echo "示例:"
  echo "  $0 excel/故障树.xlsx overview"
  echo "  $0 excel/故障树.xlsx search"
  exit 1
fi

if [ ! -f "$EXCEL_FILE" ]; then
  echo "错误: 文件不存在 - $EXCEL_FILE"
  exit 1
fi

# 创建临时脚本
TEMP_SCRIPT=$(mktemp)
trap "rm -f $TEMP_SCRIPT" EXIT

cat > "$TEMP_SCRIPT" << 'EOFSCRIPT'
#!/usr/bin/env -S npx -y -p alasql@1.7.3 -p xlsx node
const { promise: alasql } = require("alasql");
const fs = require('fs');

const excelFile = process.argv[2];
const queryType = process.argv[3] || 'overview';

(async () => {
  try {
    const data = await alasql(
      `SELECT * FROM XLSX("${excelFile}", {autoExt: false})`
    );

    if (queryType === 'overview') {
      // 数据概览
      console.log(`\n📊 文件: ${excelFile}`);
      console.log(`📈 总记录数: ${data.length}`);
      console.log(`📋 列名: ${Object.keys(data[0] || {}).join(', ')}`);
      console.log(`\n前 5 条记录:\n`);
      console.table(data.slice(0, 5));

      // 列信息分析
      console.log(`\n🔍 列信息分析:`);
      Object.keys(data[0] || {}).forEach(col => {
        const nonNull = data.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
        const uniqueValues = [...new Set(nonNull.map(row => row[col]))];
        console.log(`\n  ${col}:`);
        console.log(`    非空: ${nonNull.length}/${data.length}`);
        console.log(`    唯一值: ${uniqueValues.length} 个`);
        if (uniqueValues.length <= 10) {
          console.log(`    值: ${uniqueValues.join(', ')}`);
        }
      });
    }
    else if (queryType === 'stats') {
      // 统计分析
      console.log(`\n📊 统计分析 - ${excelFile}\n`);

      // 数值列统计
      Object.keys(data[0] || {}).forEach(col => {
        const numericValues = data
          .map(row => parseFloat(row[col]))
          .filter(val => !isNaN(val));

        if (numericValues.length > 0) {
          const sum = numericValues.reduce((a, b) => a + b, 0);
          const avg = sum / numericValues.length;
          const max = Math.max(...numericValues);
          const min = Math.min(...numericValues);

          console.log(`\n${col}:`);
          console.log(`  计数: ${numericValues.length}`);
          console.log(`  总和: ${sum.toFixed(2)}`);
          console.log(`  平均: ${avg.toFixed(2)}`);
          console.log(`  最大: ${max}`);
          console.log(`  最小: ${min}`);
        }
      });

      // 分类统计
      Object.keys(data[0] || {}).forEach(col => {
        const uniqueValues = {};
        data.forEach(row => {
          const val = row[col];
          if (val !== null && val !== undefined && val !== '') {
            uniqueValues[val] = (uniqueValues[val] || 0) + 1;
          }
        });

        if (Object.keys(uniqueValues).length > 1 && Object.keys(uniqueValues).length <= 20) {
          console.log(`\n${col} 分布:`);
          Object.entries(uniqueValues)
            .sort((a, b) => b[1] - a[1])
            .forEach(([val, count]) => {
              const pct = ((count / data.length) * 100).toFixed(1);
              console.log(`  ${val}: ${count} (${pct}%)`);
            });
        }
      });
    }
    else if (queryType === 'search') {
      // 交互式搜索（简化版）
      console.log(`\n🔍 搜索功能 - ${excelFile}`);
      console.log(`提示: 使用 filter 模式进行精确筛选\n`);

      // 显示所有唯一值（适合枚举类型的列）
      Object.keys(data[0] || {}).forEach(col => {
        const uniqueValues = [...new Set(data.map(row => row[col]))];
        if (uniqueValues.length <= 20) {
          console.log(`\n${col} 的可选值:`);
          console.log(`  ${uniqueValues.join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);
    process.exit(1);
  }
})();
EOFSCRIPT

# 执行分析
bash "$TEMP_SCRIPT" "$EXCEL_FILE" "$QUERY_TYPE"
