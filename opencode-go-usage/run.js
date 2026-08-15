#!/usr/bin/env node

/**
 * OpenCode Go 订阅用量查询工具
 * OpenCode Go Usage Skill
 *
 * 原理：opencode.ai 前端是 SolidStart SSR，GET /workspace/<id>/go 时
 * 服务端会把用量数据（lite.subscription.get）内嵌在 HTML 的 _$HY.r 块中，
 * 因此带 auth cookie 普通 GET 即可拿到实时用量，无需执行 JS。
 *
 * 请求用 Node 18+ 原生 fetch，携带完整浏览器 headers（sec-ch-ua / sec-fetch 等），
 * redirect: manual 以便识别 302 登录跳转。
 *
 * 配置（环境变量或同目录 .env）：
 *   OPENCODE_AUTH          必需，浏览器 opencode.ai 的 auth cookie 值
 *   OPENCODE_WORKSPACE_ID  必需，workspace id（形如 wrk_xxxxxxxx）
 */

const fs = require('fs');
const path = require('path');

const VERSION = typeof __VERSION !== 'undefined' ? __VERSION : (process.env.SKILL_VERSION || 'dev');
const BASE = 'https://opencode.ai';

// 完整浏览器请求头（与 Chrome 访问 /workspace/<id>/go 时一致）
const BROWSER_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'priority': 'u=0, i',
  'sec-ch-ua': '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
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
  list: args.includes('--list'),
  cookie: getArg('--cookie') || process.env.OPENCODE_AUTH || null,
  workspace: getArg('--workspace', ['-w']) || process.env.OPENCODE_WORKSPACE_ID || null,
};

// ─── 网络请求（原生 fetch + 完整浏览器头，redirect: manual，带重试） ───

async function fetchPage(urlStr, retries = 3) {
  const headers = { ...BROWSER_HEADERS, 'cookie': `oc_locale=zh; auth=${opts.cookie}` };
  let lastErr = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(urlStr, { headers, redirect: 'manual' });
      // 5xx 视为服务端抖动重试；其余状态（含 302/401/403 认证类）直接返回
      if (res.status < 500) {
        const body = await res.text();
        return { status: res.status, location: res.headers.get('location') || '', body };
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries - 1) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw lastErr;
}

// ─── 解析 ───

/**
 * 从 SSR HTML 提取用量：rollingUsage / weeklyUsage / monthlyUsage
 */
function parseUsage(html) {
  const re = /(rolling|weekly|monthly)Usage:\$R\[\d+\]=\{status:"(\w+)",resetInSec:(\d+),usagePercent:(\d+)\}/g;
  const out = {};
  let m;
  while ((m = re.exec(html)) !== null) {
    out[m[1]] = { status: m[2], resetInSec: Number(m[3]), usagePercent: Number(m[4]) };
  }
  return out;
}

/**
 * 从 SSR HTML 提取 workspace 列表（去重）
 */
function parseWorkspaces(html) {
  const re = /\{id:"(wrk_[^"]+)",name:"([^"]*)",slug:null\}/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push({ id: m[1], name: m[2] });
    }
  }
  return out;
}

function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const mi = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}天 ${h}小时`;
  if (h > 0) return `${h}小时 ${mi}分钟`;
  return `${mi}分钟`;
}

function fmtResetTime(resetInSec) {
  return new Date(Date.now() + resetInSec * 1000).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
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
  return p >= 80 ? c.red(p + '%') : p >= 50 ? c.yellow(p + '%') : c.green(p + '%');
}

function printUsage(usage, wsName, wsId) {
  const labels = { rolling: '滚动用量', weekly: '每周用量', monthly: '每月用量' };
  console.log(`\n${c.bold('OpenCode Go 用量')}  workspace: ${c.cyan(wsName)} (${wsId})\n`);
  for (const key of ['rolling', 'weekly', 'monthly']) {
    const u = usage[key];
    if (!u) continue;
    console.log(`  ${labels[key].padEnd(8)} ${String(pctColor(u.usagePercent)).padEnd(8)} 重置剩 ${fmtDuration(u.resetInSec)}（${fmtResetTime(u.resetInSec)}）`);
  }
  console.log('');
}

function printWorkspaces(wsList) {
  if (wsList.length === 0) {
    console.log('未找到 workspace 列表');
    return;
  }
  console.log(`\n${c.bold('Workspace 列表')} (${wsList.length} 个):\n`);
  for (const w of wsList) {
    console.log(`  ${c.cyan(w.id)}  ${w.name || '(未命名)'}`);
  }
  console.log('');
}

function showHelp() {
  console.log(`
OpenCode Go 订阅用量查询工具 v${VERSION}

原理: GET /workspace/<id>/go 页面（SolidStart SSR），用量内嵌在 HTML 中实时返回。

使用方法:
  node skill.js                      查询当前 workspace 用量
  node skill.js --workspace <id>     指定 workspace 查询
  node skill.js --list               列出账号下所有 workspace
  node skill.js --json               输出 JSON（适合脚本/statusline）
  node skill.js --help               显示帮助
  node skill.js --version            显示版本

选项:
  --workspace, -w <id>    workspace id（环境变量 OPENCODE_WORKSPACE_ID）
  --cookie <v>            opencode.ai 的 auth cookie（环境变量 OPENCODE_AUTH）
  --json                  输出 JSON
  --list                  列出所有 workspace

示例:
  node skill.js
  node skill.js --workspace wrk_xxxxxxxx --json

auth cookie 获取: 浏览器登录 https://opencode.ai → F12 → Application → Cookies →
opencode.ai → 复制 "auth" 的值，存入 OPENCODE_AUTH 或 .env。

网络说明: 使用 Node 原生 fetch 直连（不走系统代理）。若需代理请用 TUN/透明代理模式。
`);
}

function fail(msg, hint) {
  console.error(`\n${c.red('❌ ' + msg)}`);
  if (hint) console.error(hint);
  if (opts.json) {
    console.error(JSON.stringify({ error: msg }));
  }
  process.exit(1);
}

// ─── 主流程 ───

async function main() {
  if (opts.help) { showHelp(); return; }
  if (opts.version) { console.log(`opencode-go-usage v${VERSION}`); return; }

  if (!opts.cookie) {
    fail('缺少 auth cookie。', '请设置环境变量 OPENCODE_AUTH 或同目录 .env（参考 .env.example），或加 --cookie 参数。');
  }
  if (!opts.workspace) {
    fail('缺少 workspace id。', '请设置环境变量 OPENCODE_WORKSPACE_ID（参考 .env.example），或用 --workspace <id> 指定。');
  }

  const url = `${BASE}/workspace/${opts.workspace}/go`;

  let resp;
  try {
    resp = await fetchPage(url);
  } catch (e) {
    fail(`请求失败: ${e.message}`, '请检查网络连通性（fetch 直连，不走系统代理）。');
  }

  if (resp.status === 302 || resp.status === 401 || resp.status === 403) {
    fail(`认证失败（HTTP ${resp.status}，跳转 ${resp.location || '登录页'}）。`, 'auth cookie 可能已过期，请重新从浏览器获取。');
  }
  if (resp.status !== 200) {
    fail(`请求失败: HTTP ${resp.status}`);
  }

  const usage = parseUsage(resp.body);
  if (Object.keys(usage).length === 0) {
    fail('未能从页面解析到用量数据（页面结构可能已变化）。');
  }

  const wsList = parseWorkspaces(resp.body);
  const wsName = (wsList.find((w) => w.id === opts.workspace) || {}).name || opts.workspace;

  if (opts.list) {
    printWorkspaces(wsList);
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify({
      workspace: { id: opts.workspace, name: wsName },
      rolling: usage.rolling || null,
      weekly: usage.weekly || null,
      monthly: usage.monthly || null,
      fetchedAt: new Date().toISOString(),
    }, null, 2));
    return;
  }

  printUsage(usage, wsName, opts.workspace);
}

main().catch((e) => {
  console.error(`\n❌ 错误: ${e.message}`);
  process.exit(1);
});
