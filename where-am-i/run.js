#!/usr/bin/env node

/**
 * Get My IP - 查询公网 IP 信息
 *
 * 通过 cip.cc 获取本机公网 IP 地址及详细信息
 * 支持 JSON、简洁、原始等多种输出格式
 */

const version = process.env.SKILL_VERSION || '1.0.0';

// 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// 解析命令行参数
function parseArgs(args) {
  const options = {
    json: false,
    simple: false,
    raw: false,
  };

  for (const arg of args) {
    if (arg === '--json') options.json = true;
    if (arg === '--simple') options.simple = true;
    if (arg === '--raw') options.raw = true;
  }

  return options;
}

// 获取 IP 信息
async function getIpInfo() {
  try {
    const response = await fetch('http://cip.cc', {
      headers: {
        'User-Agent': 'curl/7.68.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return parseIpInfo(text);
  } catch (error) {
    console.error(`${colors.red}错误: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// 解析 cip.cc 响应
function parseIpInfo(text) {
  const lines = text.split('\n').filter(line => line.trim());

  const data = {
    ip: '',
    address: '',
    isp: '',
    data2: '',
    data3: '',
    url: '',
  };

  for (const line of lines) {
    // cip.cc 格式: "IP\t: 203.0.113.1"
    const match = line.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();

      switch (key) {
        case 'IP':
          data.ip = value;
          break;
        case '地址':
          data.address = value;
          break;
        case '运营商':
          data.isp = value;
          break;
        case '数据二':
          data.data2 = value;
          break;
        case '数据三':
          data.data3 = value;
          break;
        case 'URL':
          data.url = value;
          break;
      }
    }
  }

  return data;
}

// 格式化输出
function formatOutput(data, options) {
  if (options.json) {
    return JSON.stringify(data, null, 2);
  }

  if (options.simple) {
    return data.ip;
  }

  if (options.raw) {
    return Object.entries(data)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}\t: ${v}`)
      .join('\n');
  }

  // 默认格式化输出
  const maxLength = Math.max(
    'IP'.length,
    '地址'.length,
    '运营商'.length,
    '数据二'.length,
    '数据三'.length,
    'URL'.length
  );

  const lines = [
    `${'IP'.padEnd(maxLength)}\t: ${colors.green}${data.ip}${colors.reset}`,
    `${'地址'.padEnd(maxLength)}\t: ${data.address}`,
    `${'运营商'.padEnd(maxLength)}\t: ${colors.cyan}${data.isp}${colors.reset}`,
    '',
    `${'数据二'.padEnd(maxLength)}\t: ${data.data2}`,
    `${'数据三'.padEnd(maxLength)}\t: ${data.data3}`,
    '',
    `${'URL'.padEnd(maxLength)}\t: ${colors.blue}${data.url}${colors.reset}`,
  ];

  return lines.join('\n');
}

// 主函数
async function main() {
  const options = parseArgs(process.argv.slice(2));

  // 显示版本信息（调试用）
  // console.error(`${colors.dim}Get My IP v${version}${colors.reset}\n`);

  const data = await getIpInfo();
  const output = formatOutput(data, options);

  console.log(output);
}

// 运行
main().catch(error => {
  console.error(`${colors.red}错误: ${error.message}${colors.reset}`);
  process.exit(1);
});
