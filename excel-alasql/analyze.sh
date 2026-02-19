#!/bin/bash
# Excel 快速分析工具
# 无需创建临时文件，直接分析 Excel

set -e

EXCEL_FILE="$1"

if [ -z "$EXCEL_FILE" ]; then
  echo "用法: analyze.sh <Excel文件路径>"
  echo ""
  echo "示例:"
  echo "  bash analyze.sh excel/故障树.xlsx"
  echo ""
  echo "功能:"
  echo "  - 显示数据概览"
  echo "  - 列出所有列名"
  echo "  - 分析列数据类型"
  echo "  - 显示前几条记录"
  exit 1
fi

if [ ! -f "$EXCEL_FILE" ]; then
  echo "错误: 文件不存在 - $EXCEL_FILE"
  exit 1
fi

# 使用 npx 运行 AlaSQL 分析脚本
npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node -e "
const { promise: alasql } = require('alasql');

(async () => {
  try {
    console.log('');
    console.log('='.repeat(70));
    console.log('📊 Excel 数据分析');
    console.log('='.repeat(70));
    console.log(\`文件: \${process.argv[1]}\n\`);

    const data = await alasql(
      \`SELECT * FROM XLSX(\"\${process.argv[1]}\", {autoExt: false})\`
    );

    if (!data || data.length === 0) {
      console.log('⚠️  文件为空');
      return;
    }

    // 基本信息
    console.log(\`📈 总记录数: \${data.length}\`);
    console.log(\`📋 列数: \${Object.keys(data[0]).length}\`);
    console.log(\`📋 列名: \${Object.keys(data[0]).join(', ')}\n\`);

    // 数据预览
    console.log('🔍 前 5 条记录:\n');
    data.slice(0, 5).forEach((row, i) => {
      console.log(\`[\${i + 1}]\`);
      Object.entries(row).forEach(([key, val]) => {
        const strVal = String(val || '');
        const display = strVal.length > 50 ? strVal.substring(0, 50) + '...' : strVal;
        console.log(\`  \${key}: \${display}\`);
      });
      console.log('');
    });

    // 列信息分析
    console.log('\n📊 列信息分析:\n');
    Object.keys(data[0]).forEach((col, idx) => {
      const nonNull = data.filter(row =>
        row[col] !== null && row[col] !== undefined && row[col] !== ''
      );
      const uniqueValues = [...new Set(nonNull.map(row => String(row[col])))];

      console.log(\`\${idx + 1}. \${col}\`);
      console.log(\`   非空: \${nonNull.length}/\${data.length} (\${((nonNull.length/data.length)*100).toFixed(1)}%)\`);
      console.log(\`   唯一值: \${uniqueValues.length} 个\`);

      if (uniqueValues.length <= 10) {
        console.log(\`   值: \${uniqueValues.join(', ')}\`);
      } else {
        const sample = uniqueValues.slice(0, 5);
        console.log(\`   示例: \${sample.join(', ')}... (+\${uniqueValues.length - 5} 个)\`);
      }
      console.log('');
    });

    console.log('='.repeat(70));
    console.log('✅ 分析完成！');
    console.log('='.repeat(70));

  } catch (error) {
    console.error(\`\n❌ 错误: \${error.message}\`);
    process.exit(1);
  }
})();
" "$EXCEL_FILE"
