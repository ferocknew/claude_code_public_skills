#!/usr/bin/env node
// Get My IP - v260401.151719
// Generated at 2026-04-01T07:17:19.581Z


// run.js
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  cyan: "\x1B[36m"
};
function parseArgs(args) {
  const options = {
    json: false,
    simple: false,
    raw: false
  };
  for (const arg of args) {
    if (arg === "--json")
      options.json = true;
    if (arg === "--simple")
      options.simple = true;
    if (arg === "--raw")
      options.raw = true;
  }
  return options;
}
var IP_SERVICES = [
  "https://ifconfig.co",
  "https://icanhazip.com",
  "https://v4.ident.me",
  "https://ipinfo.io/ip"
];
async function getPublicIp() {
  const errors = [];
  for (const service of IP_SERVICES) {
    try {
      const response = await fetch(service, {
        headers: {
          "User-Agent": "curl/7.68.0"
        },
        signal: AbortSignal.timeout(5e3)
        // 5秒超时
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const ip = (await response.text()).trim();
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
        return ip;
      }
    } catch (error) {
      errors.push(`${service}: ${error.message}`);
    }
  }
  console.error(`${colors.yellow}\u6240\u6709 IP \u67E5\u8BE2\u670D\u52A1\u5747\u5931\u8D25\uFF1A${colors.reset}`);
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}
async function getIpInfo() {
  try {
    const ip = await getPublicIp();
    const response = await fetch(`https://api.ipquery.io/${ip}`, {
      headers: {
        "User-Agent": "curl/7.68.0",
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(1e4)
      // 10秒超时
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const json = await response.json();
    return parseIpQueryResponse(json, ip);
  } catch (error) {
    console.error(`${colors.red}\u9519\u8BEF: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}
function parseIpQueryResponse(json, ip) {
  const data = {
    ip,
    address: "",
    isp: "",
    country: "",
    region: "",
    city: "",
    timezone: "",
    latitude: "",
    longitude: "",
    asn: "",
    url: `https://api.ipquery.io/${ip}`
  };
  if (json.location) {
    const loc = json.location;
    data.country = loc.country || "";
    data.region = loc.state || loc.region || "";
    data.city = loc.city || "";
    data.timezone = loc.timezone || "";
    data.latitude = loc.latitude || "";
    data.longitude = loc.longitude || "";
    const countryZh = getCountryNameZh(loc.country_code);
    const parts = [countryZh, data.region, data.city].filter(Boolean);
    data.address = parts.join(" ");
  }
  if (json.isp) {
    data.isp = json.isp.isp || json.isp.org || "";
    data.asn = json.isp.asn || "";
  }
  return data;
}
function getCountryNameZh(code) {
  const countryMap = {
    "CN": "\u4E2D\u56FD",
    "US": "\u7F8E\u56FD",
    "JP": "\u65E5\u672C",
    "KR": "\u97E9\u56FD",
    "GB": "\u82F1\u56FD",
    "DE": "\u5FB7\u56FD",
    "FR": "\u6CD5\u56FD",
    "CA": "\u52A0\u62FF\u5927",
    "AU": "\u6FB3\u5927\u5229\u4E9A",
    "SG": "\u65B0\u52A0\u5761",
    "HK": "\u9999\u6E2F",
    "TW": "\u53F0\u6E7E"
  };
  return countryMap[code] || code;
}
function formatOutput(data, options) {
  if (options.json) {
    return JSON.stringify(data, null, 2);
  }
  if (options.simple) {
    return data.ip;
  }
  if (options.raw) {
    return Object.entries(data).filter(([_, v]) => v).map(([k, v]) => `${k}	: ${v}`).join("\n");
  }
  const maxLength = Math.max(
    "IP".length,
    "\u5730\u5740".length,
    "\u8FD0\u8425\u5546".length,
    "\u56FD\u5BB6".length,
    "\u5730\u533A".length,
    "\u57CE\u5E02".length,
    "\u65F6\u533A".length,
    "\u5750\u6807".length,
    "ASN".length,
    "URL".length
  );
  const lines = [
    `${"IP".padEnd(maxLength)}	: ${colors.green}${data.ip}${colors.reset}`,
    `${"\u5730\u5740".padEnd(maxLength)}	: ${data.address}`,
    `${"\u8FD0\u8425\u5546".padEnd(maxLength)}	: ${colors.cyan}${data.isp}${colors.reset}`
  ];
  if (data.country) {
    lines.push(`${"\u56FD\u5BB6".padEnd(maxLength)}	: ${data.country}`);
  }
  if (data.region && data.region !== data.city) {
    lines.push(`${"\u5730\u533A".padEnd(maxLength)}	: ${data.region}`);
  }
  if (data.city) {
    lines.push(`${"\u57CE\u5E02".padEnd(maxLength)}	: ${data.city}`);
  }
  if (data.timezone) {
    lines.push(`${"\u65F6\u533A".padEnd(maxLength)}	: ${data.timezone}`);
  }
  if (data.latitude && data.longitude) {
    lines.push(`${"\u5750\u6807".padEnd(maxLength)}	: ${data.latitude}, ${data.longitude}`);
  }
  if (data.asn) {
    lines.push(`${"ASN".padEnd(maxLength)}	: ${data.asn}`);
  }
  lines.push("");
  lines.push(`${"URL".padEnd(maxLength)}	: ${colors.blue}${data.url}${colors.reset}`);
  return lines.join("\n");
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const data = await getIpInfo();
  const output = formatOutput(data, options);
  console.log(output);
}
main().catch((error) => {
  console.error(`${colors.red}\u9519\u8BEF: ${error.message}${colors.reset}`);
  process.exit(1);
});
