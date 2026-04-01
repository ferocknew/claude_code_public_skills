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

// 公网 IP 查询服务列表（按优先级排序）
const IP_SERVICES = [
  'https://ifconfig.co',
  'https://icanhazip.com',
  'https://v4.ident.me',
  'https://ipinfo.io/ip',
];

// 获取公网 IP（带自动故障转移）
async function getPublicIp() {
  const errors = [];

  for (const service of IP_SERVICES) {
    try {
      const response = await fetch(service, {
        headers: {
          'User-Agent': 'curl/7.68.0',
        },
        signal: AbortSignal.timeout(5000), // 5秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const ip = (await response.text()).trim();
      // 验证 IP 格式
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
        return ip;
      }
    } catch (error) {
      errors.push(`${service}: ${error.message}`);
    }
  }

  // 所有服务都失败
  console.error(`${colors.yellow}所有 IP 查询服务均失败：${colors.reset}`);
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

// 获取 IP 详细信息
async function getIpInfo() {
  try {
    // 先获取公网 IP
    const ip = await getPublicIp();

    // 再获取详细信息
    const response = await fetch(`https://api.ipquery.io/${ip}`, {
      headers: {
        'User-Agent': 'curl/7.68.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return parseIpQueryResponse(json, ip);
  } catch (error) {
    console.error(`${colors.red}错误: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// 解析 ipquery.io 响应
function parseIpQueryResponse(json, ip) {
  const data = {
    ip: ip,
    address: '',
    isp: '',
    country: '',
    region: '',
    city: '',
    timezone: '',
    latitude: '',
    longitude: '',
    asn: '',
    url: `https://api.ipquery.io/${ip}`,
  };

  // ipquery.io 响应格式: { isp: {...}, location: {...} }
  if (json.location) {
    const loc = json.location;
    data.country = loc.country || '';
    data.region = loc.state || loc.region || '';
    data.city = loc.city || '';
    data.timezone = loc.timezone || '';
    data.latitude = loc.latitude || '';
    data.longitude = loc.longitude || '';

    // 组合地址（中文格式）
    const countryZh = getCountryNameZh(loc.country_code);
    const parts = [countryZh, data.region, data.city].filter(Boolean);
    data.address = parts.join(' ');
  }

  if (json.isp) {
    data.isp = json.isp.isp || json.isp.org || '';
    data.asn = json.isp.asn || '';
  }

  return data;
}

// 国家代码转中文
function getCountryNameZh(code) {
  const countryMap = {
    'CN': '中国',
    'US': '美国',
    'JP': '日本',
    'KR': '韩国',
    'GB': '英国',
    'DE': '德国',
    'FR': '法国',
    'CA': '加拿大',
    'AU': '澳大利亚',
    'SG': '新加坡',
    'HK': '香港',
    'TW': '台湾',
  };
  return countryMap[code] || code;
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
    '国家'.length,
    '地区'.length,
    '城市'.length,
    '时区'.length,
    '坐标'.length,
    'ASN'.length,
    'URL'.length
  );

  const lines = [
    `${'IP'.padEnd(maxLength)}\t: ${colors.green}${data.ip}${colors.reset}`,
    `${'地址'.padEnd(maxLength)}\t: ${data.address}`,
    `${'运营商'.padEnd(maxLength)}\t: ${colors.cyan}${data.isp}${colors.reset}`,
  ];

  // 添加详细信息
  if (data.country) {
    lines.push(`${'国家'.padEnd(maxLength)}\t: ${data.country}`);
  }
  if (data.region && data.region !== data.city) {
    lines.push(`${'地区'.padEnd(maxLength)}\t: ${data.region}`);
  }
  if (data.city) {
    lines.push(`${'城市'.padEnd(maxLength)}\t: ${data.city}`);
  }
  if (data.timezone) {
    lines.push(`${'时区'.padEnd(maxLength)}\t: ${data.timezone}`);
  }
  if (data.latitude && data.longitude) {
    lines.push(`${'坐标'.padEnd(maxLength)}\t: ${data.latitude}, ${data.longitude}`);
  }
  if (data.asn) {
    lines.push(`${'ASN'.padEnd(maxLength)}\t: ${data.asn}`);
  }

  lines.push('');
  lines.push(`${'URL'.padEnd(maxLength)}\t: ${colors.blue}${data.url}${colors.reset}`);

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
