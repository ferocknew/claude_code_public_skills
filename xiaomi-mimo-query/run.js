#!/usr/bin/env node

/**
 * 小米 MiMo CodingPlan 用量查询工具
 * Xiaomi MiMo CodingPlan Usage Skill
 *
 * 原理：调用小米开放平台 REST API
 *   GET https://platform.xiaomimimo.com/api/v1/tokenPlan/usage
 * 带浏览器 cookie（api-platform_serviceToken 等）即可实时返回用量，
 * 无需执行 JS。
 *
 * 配置（环境变量或同目录 .env）：
 *   XIAOMI_MIMO_COOKIE  必需，浏览器 platform.xiaomimimo.com 的完整 cookie 字符串
 *
 * cookie 获取：浏览器登录 https://platform.xiaomimimo.com → F12 → Network →
 * 刷新页面 → 任选一个请求 → Request Headers → 复制整个 "cookie:" 的值。
 */

const fs = require('fs');
const path = require('path');

const VERSION = typeof __VERSION !== 'undefined' ? __VERSION : (process.env.SKILL_VERSION || 'dev');
const BASE = 'https://platform.xiaomimimo.com';

// 浏览器请求头（与 Chrome 访问 plan-manage 页面时一致）
const BROWSER_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  'content-type': 'application/json',
  'pragma': 'no-cache',
  'priority': 'u=1, i',
  'referer': 'https://platform.xiaomimimo.com/console/plan-manage',
  'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'x-timezone': 'Asia/Shanghai',
};

// ─── .env 加载（简单解析，同目录 .env，不覆盖已存在的环境变量） ───

function loadDotEnv() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const idx = s.indexOf('=');
    if (idx === -1) continue;
    const key = s.slice(0, idx).trim();
    const val = s.slice(idx + 1).trim();
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

// ─── 参数解析 ───

const args = process.argv.slice(2);

function getArg(name, aliases = []) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name || aliases.includes(args[i])) return args[i + 1];
  }
  return null;
}

const opts = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-v'),
  json: args.includes('--json'),
  cookie: getArg('--cookie') || process.env.XIAOMI_MIMO_COOKIE || null,
};

// ─── 网络请求（原生 fetch + 完整浏览器头，带重试） ───

async function fetchUsage(retries = 3) {
  const url = `${BASE}/api/v1/tokenPlan/usage`;
  const headers = { ...BROWSER_HEADERS, 'cookie': opts.cookie };
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers, redirect: 'manual' });
      const body = await res.text();
      if (res.status < 500) return { status: res.status, body };
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw lastErr;
}

// ─── 解析 ───

function parseResult(json) {
  if (json.code !== 0) {
    throw new Error(`接口返回错误: code=${json.code} message=${json.message || ''}`);
  }
  const data = json.data || {};
  const monthUsage = data.monthUsage || {};
  const usage = data.usage || {};

  const toItem = (items, name) => (items || []).find((i) => i.name === name) || null;

  return {
    month: toItem(monthUsage.items, 'month_total_token'),
    plan: toItem(usage.items, 'plan_total_token'),
    compensation: toItem(usage.items, 'compensation_total_token'),
  };
}

// ─── 格式化 ───

function fmtTokens(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function fmtPercent(p) {
  return (p * 100).toFixed(2) + '%';
}

// ─── 输出 ───

const isTTY = !!process.stdout.isTTY;
const c = {
  green: (s) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  cyan: (s) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s),
  bold: (s) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
};

function pctColor(p) {
  return p >= 0.8 ? c.red(fmtPercent(p)) : p >= 0.5 ? c.yellow(fmtPercent(p)) : c.green(fmtPercent(p));
}

function usageLine(label, item) {
  if (!item) return `  ${label.padEnd(6)} ${c.yellow('无数据')}`;
  const used = fmtTokens(item.used);
  const limit = fmtTokens(item.limit);
  return `  ${label.padEnd(6)} ${pctColor(item.percent).padEnd(9)} 使用 ${used} / ${limit} tokens`;
}

function printUsage(result) {
  console.log(`\n${c.bold('小米 MiMo CodingPlan 用量')}\n`);
  console.log(usageLine('本月用量', result.month));
  console.log(usageLine('计划总量', result.plan));
  console.log(usageLine('补偿额度', result.compensation));
  console.log('');
}

function showHelp() {
  console.log(`
小米 MiMo CodingPlan 用量查询工具 v${VERSION}

原理: GET /api/v1/tokenPlan/usage（小米开放平台 REST API），带浏览器 cookie 实时返回。

使用方法:
  node skill.js                      查询用量
  node skill.js --json               JSON 输出（适合脚本）
  node skill.js --cookie '<v>'      临时指定 cookie
  node skill.js --help               显示帮助
  node skill.js --version            显示版本

选项:
  --cookie <v>    浏览器 platform.xiaomimimo.com 的完整 cookie（环境变量 XIAOMI_MIMO_COOKIE）
  --json          输出 JSON

示例:
  node skill.js
  node skill.js --json

cookie 获取: 浏览器登录 https://platform.xiaomimimo.com → F12 → Network →
刷新页面 → 任选请求 → Request Headers → 复制整个 "cookie:" 的值，
存入 XIAOMI_MIMO_COOKIE 或同目录 .env（参考 .env.example，.env 已被 gitignore）。

网络说明: 使用 Node 原生 fetch 直连（不走系统代理）。若需代理请用 TUN/透明代理模式。
`);
}

function fail(msg, hint) {
  console.error(`\n❌ ${msg}`);
  if (hint) console.error(hint);
  if (opts.json) {
    console.error(JSON.stringify({ error: msg }));
  }
  process.exit(1);
}

// ─── 主流程 ───

async function main() {
  if (opts.help) { showHelp(); return; }
  if (opts.version) { console.log(`xiaomi-mimo-query v${VERSION}`); return; }

  if (!opts.cookie) {
    fail('缺少 cookie。', '请设置环境变量 XIAOMI_MIMO_COOKIE 或同目录 .env（参考 .env.example），或加 --cookie 参数。');
  }

  let resp;
  try {
    resp = await fetchUsage();
  } catch (e) {
    fail(`请求失败: ${e.message}`, '请检查网络连通性（fetch 直连，不走系统代理）。');
  }

  if (resp.status === 401 || resp.status === 403) {
    fail(`认证失败（HTTP ${resp.status}）。`, 'cookie 可能已过期，请重新从浏览器获取。');
  }
  if (resp.status !== 200) {
    fail(`请求失败: HTTP ${resp.status}`);
  }

  let result;
  try {
    result = parseResult(JSON.parse(resp.body));
  } catch (e) {
    fail(`解析失败: ${e.message}`, '接口返回结构可能已变化。');
  }

  if (opts.json) {
    console.log(JSON.stringify({
      month: result.month,
      plan: result.plan,
      compensation: result.compensation,
      fetchedAt: new Date().toISOString(),
    }, null, 2));
    return;
  }

  printUsage(result);
}

main().catch((e) => {
  console.error(`\n❌ 错误: ${e.message}`);
  process.exit(1);
});