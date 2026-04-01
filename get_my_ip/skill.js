#!/usr/bin/env node
// Get My IP - v260401.145411
// Generated at 2026-04-01T06:54:11.809Z


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
async function getIpInfo() {
  try {
    const response = await fetch("http://cip.cc", {
      headers: {
        "User-Agent": "curl/7.68.0"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    return parseIpInfo(text);
  } catch (error) {
    console.error(`${colors.red}\u9519\u8BEF: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}
function parseIpInfo(text) {
  const lines = text.split("\n").filter((line) => line.trim());
  const data = {
    ip: "",
    address: "",
    isp: "",
    data2: "",
    data3: "",
    url: ""
  };
  for (const line of lines) {
    const match = line.match(/^([^:]+?)\s*:\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      switch (key) {
        case "IP":
          data.ip = value;
          break;
        case "\u5730\u5740":
          data.address = value;
          break;
        case "\u8FD0\u8425\u5546":
          data.isp = value;
          break;
        case "\u6570\u636E\u4E8C":
          data.data2 = value;
          break;
        case "\u6570\u636E\u4E09":
          data.data3 = value;
          break;
        case "URL":
          data.url = value;
          break;
      }
    }
  }
  return data;
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
    "\u6570\u636E\u4E8C".length,
    "\u6570\u636E\u4E09".length,
    "URL".length
  );
  const lines = [
    `${"IP".padEnd(maxLength)}	: ${colors.green}${data.ip}${colors.reset}`,
    `${"\u5730\u5740".padEnd(maxLength)}	: ${data.address}`,
    `${"\u8FD0\u8425\u5546".padEnd(maxLength)}	: ${colors.cyan}${data.isp}${colors.reset}`,
    "",
    `${"\u6570\u636E\u4E8C".padEnd(maxLength)}	: ${data.data2}`,
    `${"\u6570\u636E\u4E09".padEnd(maxLength)}	: ${data.data3}`,
    "",
    `${"URL".padEnd(maxLength)}	: ${colors.blue}${data.url}${colors.reset}`
  ];
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
