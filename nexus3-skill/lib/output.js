// 输出格式化：table（默认，基于 _columns 精简）/ json（原始完整）/ yaml

function output(data, format = 'table') {
  if (data === null || data === undefined) {
    console.log('(no content)');
    return;
  }

  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (format === 'yaml') {
    console.log(toYaml(data));
    return;
  }

  // table / default：人类可读
  if (typeof data === 'string') {
    console.log(data);
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('(no results)');
      return;
    }
    renderTable(data, format === 'table');
    return;
  }

  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(data);
}

function renderTable(items, isTable) {
  if (!items.length) return;

  // 优先使用数据自带的 _columns 提示渲染表格
  if (items[0]._columns) {
    const columns = items[0]._columns;
    const rows = items.map(it => columns.map(c => String(it[c] ?? '')));

    if (isTable) {
      const widths = columns.map((c, i) =>
        Math.max(c.length, ...rows.map(r => r[i].length))
      );
      const sep = widths.map(w => '-'.repeat(w + 2)).join('+');
      const header = columns.map((c, i) => ` ${c.padEnd(widths[i])} `).join('|');
      console.log(sep);
      console.log(header);
      console.log(sep);
      for (const row of rows) {
        console.log(row.map((c, i) => ` ${c.padEnd(widths[i])} `).join('|'));
      }
      console.log(sep);
    } else {
      for (const row of rows) {
        console.log(row.join('  '));
      }
    }
    return;
  }

  // 兜底：直接 JSON
  console.log(JSON.stringify(items, null, 2));
}

function toYaml(data, indent = 0) {
  const pad = '  '.repeat(indent);
  if (data === null || data === undefined) return `${pad}null\n`;
  if (typeof data !== 'object') return `${pad}${data}\n`;
  if (Array.isArray(data)) {
    if (data.length === 0) return `${pad}[]\n`;
    return data
      .map(item => {
        if (typeof item !== 'object' || item === null) return `${pad}- ${item}\n`;
        const inner = toYaml(item, indent + 1);
        return `${pad}- ${inner.trimStart()}`;
      })
      .join('');
  }
  return Object.entries(data)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${v === null ? 'null' : v}\n`;
    })
    .join('');
}

module.exports = output;
