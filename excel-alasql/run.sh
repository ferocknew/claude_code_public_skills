#!/bin/bash
# Excel 通用查询工具
#
# 用法:
#   bash run.sh <文件路径> [操作]
#
# 示例:
#   bash run.sh excel/故障树.xlsx                    # 数据概览
#   bash run.sh excel/故障树.xlsx "中间事件"         # 按值筛选
#   bash run.sh excel/故障树.xlsx "*"                 # 导出 JSON

set -e

EXCEL_FILE="$1"
OPERATION="$2"

# 显示帮助
if [ -z "$EXCEL_FILE" ] || [ "$EXCEL_FILE" = "-h" ] || [ "$EXCEL_FILE" = "--help" ]; then
  cat << 'HELP'
Excel 通用查询工具 v1.0

用法:
  bash run.sh <文件路径> [操作]

参数:
  文件路径   Excel 文件路径（必需）
  操作       可选操作（见下文）

操作类型:
  (无参数)   显示数据概览
  "关键词"   筛选包含此关键词的记录（全文搜索）
  "*"        导出全部数据为 JSON
  ">文件名"  导出为 Excel 文件

示例:
  # 数据概览
  bash run.sh excel/故障树.xlsx

  # 筛选包含"中间事件"的记录
  bash run.sh excel/故障树.xlsx "中间事件"

  # 导出 JSON
  bash run.sh excel/故障树.xlsx "*" > output.json

快捷选项:
  -h, --help     显示此帮助信息

提示:
  - 复杂查询建议使用 analyze.sh 或创建自定义脚本
  - 中文列名筛选暂时不支持，使用关键词搜索代替
HELP
  exit 0
fi

if [ ! -f "$EXCEL_FILE" ]; then
  echo "错误: 文件不存在 - $EXCEL_FILE"
  exit 1
fi

# 将操作参数写入临时文件
TEMP_OP=$(mktemp)
if [ -n "$OPERATION" ]; then
  echo "$OPERATION" > "$TEMP_OP"
fi

# 使用 npx 运行 AlaSQL
npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node -e "
const { promise: alasql } = require('alasql');
const fs = require('fs');

(async () => {
  try {
    const data = await alasql(
      'SELECT * FROM XLSX(\"${EXCEL_FILE}\", {autoExt: false})'
    );

    if (!data || data.length === 0) {
      console.log('⚠️  文件为空');
      return;
    }

    // 从临时文件读取操作参数
    let operation = '';
    try {
      operation = fs.readFileSync('${TEMP_OP}', 'utf8').trim();
    } catch (e) {
      // 文件不存在或为空
    }

    // 模式 1: 导出 JSON
    if (operation === '*') {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // 模式 2: 关键词筛选
    if (operation) {
      console.log('🔍 筛选结果: \"' + operation + '\"');
      console.log('='.repeat(70));
      console.log('文件: ${EXCEL_FILE}\\n');

      // 全文搜索关键词
      const filtered = data.filter(row =>
        Object.values(row).some(val =>
          String(val).includes(operation)
        )
      );

      if (filtered.length > 0) {
        console.log('✓ 找到 ' + filtered.length + ' 条匹配记录\\n');
        console.table(filtered);
      } else {
        console.log('⚠️  未找到匹配记录');
      }
      return;
    }

    // 模式 3: 数据概览
    console.log('📊 Excel 数据概览');
    console.log('='.repeat(70));
    console.log('文件: ${EXCEL_FILE}\\n');
    console.log('总记录数: ' + data.length);
    console.log('列数: ' + Object.keys(data[0]).length);
    console.log('列名: ' + Object.keys(data[0]).join(', ') + '\\n');

    console.log('前 3 条记录:\\n');
    data.slice(0, 3).forEach((row, i) => {
      console.log('[' + (i + 1) + ']');
      Object.entries(row).forEach(([key, val]) => {
        const strVal = String(val || '');
        const display = strVal.length > 40 ? strVal.substring(0, 40) + '...' : strVal;
        console.log('  ' + key + ': ' + display);
      });
      console.log('');
    });

    console.log('列信息分析:\\n');
    Object.keys(data[0]).forEach((col, idx) => {
      const nonNull = data.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
      const uniqueValues = [...new Set(nonNull.map(row => String(row[col])))];

      console.log((idx + 1) + '. ' + col);
      console.log('   非空: ' + nonNull.length + '/' + data.length + ' (' + ((nonNull.length/data.length)*100).toFixed(1) + '%)');
      console.log('   唯一值: ' + uniqueValues.length + ' 个');

      if (uniqueValues.length <= 8) {
        console.log('   值: ' + uniqueValues.join(', '));
      }
    });

    console.log('\\n💡 使用示例:');
    console.log('  bash run.sh ${EXCEL_FILE} \"关键词\"    - 搜索包含关键词的记录');
    console.log('  bash run.sh ${EXCEL_FILE} \"*\"         - 导出 JSON');

  } catch (error) {
    console.error('\\n❌ 错误: ' + error.message);
    process.exit(1);
  }
})();
"

# 清理临时文件
rm -f "$TEMP_OP"
