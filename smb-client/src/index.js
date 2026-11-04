/**
 * SMB / CIFS 客户端工具 (smb-client)
 *
 * 双引擎架构：
 *   1. 系统 smbclient CLI —— 已安装时优先使用
 *   2. 纯 JS 引擎 @marsaud/smb2 —— 未安装或 CLI 执行失败时回退，已打包进 skill.js，无需 npm install
 *
 * 用法:
 *   node skill.js <command> [args...] [options...]
 *
 * 命令:
 *   test [path]                    测试连接与鉴权
 *   ls [remoteDir]                 列出远程目录（--recursive 递归）
 *   stat <remotePath>              查看文件/目录大小与属性
 *   cat <remoteFile>               读取远程文件内容到控制台
 *   get <remoteFile> <localPath>   下载远程文件到本地
 *   put <localPath> <remoteFile>   上传本地文件到远程 SMB
 *   mkdir <remoteDir>              递归创建远程目录
 *   rm <remoteFile>                删除远程文件
 *   rmdir <remoteDir>              删除远程空目录
 *   rename <oldPath> <newPath>     重命名或移动远程文件
 *   shares | list-shares           列出服务器共享（依赖 smbclient）
 */

const SMB2 = require('@marsaud/smb2');
const { promisify } = require('util');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// 构建时由 build.js 通过 esbuild define 注入；直接运行源码时回退为 dev
const SKILL_VERSION = typeof __VERSION !== 'undefined' ? __VERSION : 'dev';

// ===================== 帮助信息 =====================
function printHelp() {
  console.log(`SMB / CIFS Client Tool (smb-client) v${SKILL_VERSION}
用于连接 SMB/CIFS 共享，浏览、读取、下载、上传、管理远程共享文件。
内置双引擎：优先调用系统 smbclient，未安装时自动回退到打包好的纯 JS 引擎。

用法:
  node skill.js <command> [args...] [options...]

命令总表:
  test [path]                    测试 SMB 共享连接与鉴权
  ls [remoteDir]                 列出远程目录内容 (--recursive 递归子目录)
  stat <remotePath>              查看文件/目录大小与属性
  cat <remoteFile>               读取远程文件内容输出到控制台
  get <remoteFile> <localPath>   下载远程文件到本地
  put <localPath> <remoteFile>   上传本地文件到远程 SMB
  mkdir <remoteDir>              创建远程目录 (支持递归)
  rm <remoteFile>                删除远程文件
  rmdir <remoteDir>              删除远程空目录
  rename <oldPath> <newPath>     重命名或移动远程文件
  shares | list-shares           列出服务器公开的共享列表 (需安装 smbclient)

连接参数 (优先级: 命令行选项 > --smb 串 > smb:// URL > 环境变量):
  --host <ip/domain>             SMB 服务器地址 (环境变量: SMB_HOST)
  --share <shareName>            共享文件夹名称 (如 video, data) (环境变量: SMB_SHARE)
  --user <username>              用户名 (环境变量: SMB_USER, 默认: guest)
  --password <password>          密码 (环境变量: SMB_PASSWORD)
  --domain <domain>              域或工作组 (环境变量: SMB_DOMAIN, 默认: WORKGROUP)
  --port <port>                  SMB 端口 (默认: 445)
  --smb <key:val,...>            紧凑参数串: "host:smb.example.com,share:myshare,user:username,password:your_password"
  --url <smb://...>              SMB URL: "smb://user:pass@host/share/subpath"

选项:
  --recursive                    ls 时递归列出子目录
  --json                         以纯 JSON 格式输出结果 (便于程序与 LLM 解析)
  --max-bytes <n>                cat 时限制最大读取字节数 (默认 10MB)
  --encoding <enc>               文本编码 (默认: utf8)
  --timeout <ms>                 smbclient 引擎单次执行超时 (默认: 30000)
  -v, --version                  显示版本号
  -h, --help                     显示此帮助信息
`);
}

// ===================== 参数解析 =====================
function parseSmbUrl(urlStr) {
  if (!urlStr.startsWith('smb://')) return null;
  try {
    const u = new URL(urlStr);
    const host = u.hostname;
    const port = u.port ? parseInt(u.port, 10) : 445;
    const user = decodeURIComponent(u.username || '');
    const password = decodeURIComponent(u.password || '');
    const parts = u.pathname.replace(/^\/+/, '').split('/');
    const share = parts[0] || '';
    const subpath = parts.slice(1).join('\\');
    return { host, port, user, password, share, subpath };
  } catch (e) {
    return null;
  }
}

function parseArgs(rawArgs) {
  const args = [];
  const options = {
    host: process.env.SMB_HOST || '',
    share: process.env.SMB_SHARE || '',
    user: process.env.SMB_USER || 'guest',
    password: process.env.SMB_PASSWORD || '',
    domain: process.env.SMB_DOMAIN || 'WORKGROUP',
    port: process.env.SMB_PORT ? parseInt(process.env.SMB_PORT, 10) : 445,
    json: false,
    recursive: false,
    maxBytes: 10 * 1024 * 1024,
    encoding: 'utf8',
    timeout: 30000,
  };

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--recursive') {
      options.recursive = true;
    } else if (arg === '--host' && i + 1 < rawArgs.length) {
      options.host = rawArgs[++i];
    } else if (arg === '--share' && i + 1 < rawArgs.length) {
      options.share = rawArgs[++i];
    } else if (arg === '--user' && i + 1 < rawArgs.length) {
      options.user = rawArgs[++i];
    } else if (arg === '--password' && i + 1 < rawArgs.length) {
      options.password = rawArgs[++i];
    } else if (arg === '--domain' && i + 1 < rawArgs.length) {
      options.domain = rawArgs[++i];
    } else if (arg === '--port' && i + 1 < rawArgs.length) {
      options.port = parseInt(rawArgs[++i], 10);
    } else if (arg === '--max-bytes' && i + 1 < rawArgs.length) {
      options.maxBytes = parseInt(rawArgs[++i], 10);
    } else if (arg === '--encoding' && i + 1 < rawArgs.length) {
      options.encoding = rawArgs[++i];
    } else if (arg === '--timeout' && i + 1 < rawArgs.length) {
      options.timeout = parseInt(rawArgs[++i], 10);
    } else if (arg === '--url' && i + 1 < rawArgs.length) {
      const parsed = parseSmbUrl(rawArgs[++i]);
      if (parsed) {
        if (parsed.host) options.host = parsed.host;
        if (parsed.port) options.port = parsed.port;
        if (parsed.user) options.user = parsed.user;
        if (parsed.password) options.password = parsed.password;
        if (parsed.share) options.share = parsed.share;
        if (parsed.subpath) options.subpath = parsed.subpath;
      }
    } else if (arg === '--smb' && i + 1 < rawArgs.length) {
      const kvPairs = rawArgs[++i].split(',');
      for (const pair of kvPairs) {
        const [k, ...vParts] = pair.split(':');
        const v = vParts.join(':');
        if (k === 'host') options.host = v;
        else if (k === 'share') options.share = v;
        else if (k === 'user' || k === 'username') options.user = v;
        else if (k === 'password' || k === 'pass') options.password = v;
        else if (k === 'domain') options.domain = v;
        else if (k === 'port') options.port = parseInt(v, 10);
      }
    } else if (arg.startsWith('smb://')) {
      const parsed = parseSmbUrl(arg);
      if (parsed) {
        if (parsed.host) options.host = parsed.host;
        if (parsed.port) options.port = parsed.port;
        if (parsed.user) options.user = parsed.user;
        if (parsed.password) options.password = parsed.password;
        if (parsed.share) options.share = parsed.share;
        if (parsed.subpath) options.subpath = parsed.subpath;
      }
    } else if (!arg.startsWith('-')) {
      args.push(arg);
    }
  }

  return { args, options };
}

// ===================== 通用工具 =====================
function normalizeSmbPath(p) {
  if (!p || p === '/' || p === '.' || p === '\\') return '';
  return p.replace(/\//g, '\\').replace(/^\\+/, '').replace(/\\+$/, '');
}

function toPosix(p) {
  return String(p || '').replace(/\\/g, '/');
}

function quoteSmb(p) {
  return `"${String(p || '').replace(/"/g, '\\"')}"`;
}

// ===================== smbclient 引擎 =====================
let _smbClientAvailable = null;

function hasSmbClient() {
  if (_smbClientAvailable !== null) return _smbClientAvailable;
  try {
    const r = spawnSync('smbclient', ['--version'], { stdio: 'ignore', timeout: 5000 });
    _smbClientAvailable = !r.error;
  } catch (e) {
    _smbClientAvailable = false;
  }
  return _smbClientAvailable;
}

function buildSmbClientArgs(options, commandScript) {
  const creds = `${options.user || 'guest'}%${options.password || ''}`;
  const args = ['-U', creds, '-p', String(options.port || 445)];
  if (options.domain) args.push('-W', options.domain);
  if (commandScript) args.push('-c', commandScript);
  args.push(`//${options.host}/${options.share}`);
  return args;
}

function buildListSharesArgs(options) {
  const creds = `${options.user || 'guest'}%${options.password || ''}`;
  const args = ['-L', options.host, '-U', creds, '-p', String(options.port || 445), '-g'];
  if (options.domain) args.push('-W', options.domain);
  return args;
}

function execSmbClient(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn('smbclient', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGKILL'); } catch (e) {}
      reject(new Error(`smbclient 执行超时 (${timeoutMs}ms)`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function runSmbClient(args, timeoutMs) {
  const r = await execSmbClient(args, timeoutMs);
  if (r.code !== 0) {
    const detail = (r.stderr || r.stdout || '').trim() || `smbclient 退出码 ${r.code}`;
    const err = new Error(detail);
    err.code = 'SMBCLIENT_ERROR';
    throw err;
  }
  return r.stdout;
}

function assertNoSmbError(text, ignoreCodes = []) {
  const matches = String(text || '').match(/NT_STATUS_[A-Z0-9_]+/g) || [];
  const bad = matches.find((c) => !ignoreCodes.includes(c));
  if (bad) {
    const err = new Error(`smbclient 返回错误: ${bad}`);
    err.code = bad;
    throw err;
  }
}

// 解析 smbclient 'ls' 输出（含递归时的 \dir 目录头）
function parseSmbClientList(output) {
  const entries = [];
  let currentDir = '';
  for (const rawLine of String(output || '').split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) continue;

    const header = line.match(/^\s*\\(.+)$/);
    if (header) {
      currentDir = header[1].trim().replace(/\\+$/, '');
      continue;
    }

    const m = line.match(/^\s+(.+?)\s{2,}([A-Z]+)\s+(\d+)\s{2,}/);
    if (!m) continue;

    const name = m[1].trim();
    if (!name || name === '.' || name === '..') continue;

    const flags = m[2];
    const size = parseInt(m[3], 10);
    const isDir = flags.includes('D');
    const relPath = currentDir ? `${currentDir}\\${name}` : name;
    entries.push({
      name,
      path: toPosix(relPath),
      type: isDir ? 'directory' : 'file',
      size: isDir ? null : size,
    });
  }
  return entries;
}

function parseShareList(output) {
  const shares = [];
  for (const line of String(output || '').split(/\r?\n/)) {
    const parts = line.split('|');
    if (parts.length < 2) continue;
    const type = parts[0].trim();
    if (!['Disk', 'IPC', 'Printer', 'Print'].includes(type)) continue;
    shares.push({
      name: parts[1].trim(),
      type: type.toLowerCase(),
      comment: (parts[2] || '').trim(),
    });
  }
  return shares;
}

async function runViaSmbClient(command, args, options, output) {
  const timeoutMs = options.timeout || 30000;
  const remoteArg = args[1] || options.subpath || '';
  const remotePath = normalizeSmbPath(remoteArg);

  switch (command) {
    case 'test': {
      const script = remotePath ? `cd ${quoteSmb(remotePath)}; pwd` : 'pwd';
      const out = await runSmbClient(buildSmbClientArgs(options, script), timeoutMs);
      assertNoSmbError(out);
      output({
        success: true,
        engine: 'smbclient',
        message: 'SMB 共享连接认证成功',
        host: options.host,
        share: options.share,
        user: options.user,
        pathChecked: remotePath ? toPosix(remotePath) : '/',
      });
      return;
    }

    case 'ls':
    case 'list': {
      const script = options.recursive
        ? (remotePath ? `cd ${quoteSmb(remotePath)}; recurse ON; ls` : 'recurse ON; ls')
        : (remotePath ? `cd ${quoteSmb(remotePath)}; ls` : 'ls');
      const out = await runSmbClient(buildSmbClientArgs(options, script), timeoutMs);
      const entries = parseSmbClientList(out);
      if (entries.length === 0) assertNoSmbError(out);
      output({
        success: true,
        engine: 'smbclient',
        path: remotePath ? toPosix(remotePath) : '/',
        count: entries.length,
        entries,
      });
      return;
    }

    case 'stat': {
      if (!remotePath) throw new Error('缺少参数: 请指定 remotePath');
      let out;
      try {
        out = await runSmbClient(buildSmbClientArgs(options, `stat ${quoteSmb(remotePath)}`), timeoutMs);
      } catch (e) {
        // 旧版 smbclient 没有 stat 命令，退回 allinfo
        out = await runSmbClient(buildSmbClientArgs(options, `allinfo ${quoteSmb(remotePath)}`), timeoutMs);
      }
      assertNoSmbError(out);
      const sizeMatch = out.match(/(?:^|\n)\s*size:\s*(\d+)/i);
      const isDir = /attributes:.*\bD\b/i.test(out) || /<DIR>/i.test(out);
      output({
        success: true,
        engine: 'smbclient',
        path: toPosix(remotePath),
        type: isDir ? 'directory' : 'file',
        size: sizeMatch ? parseInt(sizeMatch[1], 10) : null,
        raw: out.trim(),
      });
      return;
    }

    case 'cat':
    case 'read': {
      if (!remotePath) throw new Error('缺少参数: 请指定 remoteFile');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smb-client-'));
      const tmpFile = path.join(tmpDir, 'content');
      try {
        const out = await runSmbClient(
          buildSmbClientArgs(options, `get ${quoteSmb(remotePath)} ${quoteSmb(tmpFile)}`),
          timeoutMs
        );
        assertNoSmbError(out);
        const buffer = fs.readFileSync(tmpFile);
        if (buffer.length > options.maxBytes) {
          throw new Error(`文件大小 (${buffer.length} 字节) 超过允许的最大读取上限 (${options.maxBytes} 字节)`);
        }
        if (options.json) {
          output({
            success: true,
            engine: 'smbclient',
            path: toPosix(remotePath),
            size: buffer.length,
            content: buffer.toString(options.encoding),
          });
        } else {
          process.stdout.write(buffer.toString(options.encoding));
        }
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
      }
      return;
    }

    case 'get':
    case 'download': {
      const targetPath = normalizeSmbPath(args[1]);
      const localPath = args[2];
      if (!targetPath || !localPath) throw new Error('用法: get <remoteFile> <localPath>');
      const resolvedLocal = path.resolve(localPath);
      fs.mkdirSync(path.dirname(resolvedLocal), { recursive: true });
      const out = await runSmbClient(
        buildSmbClientArgs(options, `get ${quoteSmb(targetPath)} ${quoteSmb(resolvedLocal)}`),
        timeoutMs
      );
      assertNoSmbError(out);
      const bytes = fs.existsSync(resolvedLocal) ? fs.statSync(resolvedLocal).size : 0;
      output({
        success: true,
        engine: 'smbclient',
        message: '文件下载成功',
        remotePath: toPosix(targetPath),
        localPath: resolvedLocal,
        bytesDownloaded: bytes,
      });
      return;
    }

    case 'put':
    case 'upload': {
      const localPath = args[1];
      const targetPath = normalizeSmbPath(args[2]);
      if (!localPath || !targetPath) throw new Error('用法: put <localPath> <remoteFile>');
      const resolvedLocal = path.resolve(localPath);
      if (!fs.existsSync(resolvedLocal)) {
        throw new Error(`本地文件不存在: ${resolvedLocal}`);
      }

      const commands = [];
      const parent = targetPath.includes('\\') ? targetPath.slice(0, targetPath.lastIndexOf('\\')) : '';
      if (parent) {
        let cur = '';
        for (const seg of parent.split('\\').filter(Boolean)) {
          cur = cur ? `${cur}\\${seg}` : seg;
          commands.push(`mkdir ${quoteSmb(cur)}`);
        }
      }
      commands.push(`put ${quoteSmb(resolvedLocal)} ${quoteSmb(targetPath)}`);

      const out = await runSmbClient(buildSmbClientArgs(options, commands.join('; ')), timeoutMs);
      assertNoSmbError(out, ['NT_STATUS_OBJECT_NAME_COLLISION', 'NT_STATUS_OBJECT_ALREADY_EXISTS']);
      const bytes = fs.statSync(resolvedLocal).size;
      output({
        success: true,
        engine: 'smbclient',
        message: '文件上传成功',
        localPath: resolvedLocal,
        remotePath: toPosix(targetPath),
        bytesUploaded: bytes,
      });
      return;
    }

    case 'mkdir': {
      const targetPath = normalizeSmbPath(args[1]);
      if (!targetPath) throw new Error('用法: mkdir <remoteDir>');
      const commands = [];
      let cur = '';
      for (const seg of targetPath.split('\\').filter(Boolean)) {
        cur = cur ? `${cur}\\${seg}` : seg;
        commands.push(`mkdir ${quoteSmb(cur)}`);
      }
      const out = await runSmbClient(buildSmbClientArgs(options, commands.join('; ')), timeoutMs);
      assertNoSmbError(out, ['NT_STATUS_OBJECT_NAME_COLLISION', 'NT_STATUS_OBJECT_ALREADY_EXISTS']);
      output({
        success: true,
        engine: 'smbclient',
        message: '目录创建成功',
        path: toPosix(targetPath),
      });
      return;
    }

    case 'rm':
    case 'unlink': {
      const targetPath = normalizeSmbPath(args[1]);
      if (!targetPath) throw new Error('用法: rm <remoteFile>');
      const out = await runSmbClient(buildSmbClientArgs(options, `del ${quoteSmb(targetPath)}`), timeoutMs);
      assertNoSmbError(out);
      output({
        success: true,
        engine: 'smbclient',
        message: '远程文件已删除',
        path: toPosix(targetPath),
      });
      return;
    }

    case 'rmdir': {
      const targetPath = normalizeSmbPath(args[1]);
      if (!targetPath) throw new Error('用法: rmdir <remoteDir>');
      const out = await runSmbClient(buildSmbClientArgs(options, `rmdir ${quoteSmb(targetPath)}`), timeoutMs);
      assertNoSmbError(out);
      output({
        success: true,
        engine: 'smbclient',
        message: '远程目录已删除',
        path: toPosix(targetPath),
      });
      return;
    }

    case 'rename':
    case 'mv': {
      const oldPath = normalizeSmbPath(args[1]);
      const newPath = normalizeSmbPath(args[2]);
      if (!oldPath || !newPath) throw new Error('用法: rename <oldPath> <newPath>');
      const out = await runSmbClient(
        buildSmbClientArgs(options, `rename ${quoteSmb(oldPath)} ${quoteSmb(newPath)}`),
        timeoutMs
      );
      assertNoSmbError(out);
      output({
        success: true,
        engine: 'smbclient',
        message: '远程文件/目录已重命名',
        from: toPosix(oldPath),
        to: toPosix(newPath),
      });
      return;
    }

    case 'shares':
    case 'list-shares': {
      if (!options.host) throw new Error('缺少必要参数: host (通过 --host 或 SMB_HOST 提供)');
      const out = await runSmbClient(buildListSharesArgs(options), timeoutMs);
      const shares = parseShareList(out);
      output({
        success: true,
        engine: 'smbclient',
        host: options.host,
        count: shares.length,
        shares,
      });
      return;
    }

    default:
      throw new Error(
        `未知命令: ${command}。支持的命令: test, ls, stat, cat, get, put, mkdir, rm, rmdir, rename, shares`
      );
  }
}

// ===================== 纯 JS 引擎 =====================
async function createClient(opts) {
  if (!opts.host) throw new Error('缺少必要参数: host (通过 --host, --smb 或 SMB_HOST 提供)');
  if (!opts.share) throw new Error('缺少必要参数: share (通过 --share, --smb 或 SMB_SHARE 提供)');

  const sharePath = `\\\\${opts.host}\\${opts.share}`;
  const client = new SMB2({
    share: sharePath,
    domain: opts.domain || 'WORKGROUP',
    username: opts.user || 'guest',
    password: opts.password || '',
    port: opts.port || 445,
    autoCloseTimeout: 10000,
  });

  return {
    client,
    readdir: promisify(client.readdir.bind(client)),
    readFile: promisify(client.readFile.bind(client)),
    writeFile: promisify(client.writeFile.bind(client)),
    mkdir: promisify(client.mkdir.bind(client)),
    rmdir: promisify(client.rmdir.bind(client)),
    unlink: promisify(client.unlink.bind(client)),
    rename: promisify(client.rename.bind(client)),
    exists: promisify(client.exists.bind(client)),
    getSize: promisify(client.getSize.bind(client)),
    stat: promisify(client.stat.bind(client)),
    // @marsaud/smb2 没有 ensureDir 方法，这里逐级 exists+mkdir 手动递归建目录
    ensureDir: async (dirPath) => {
      const segments = String(dirPath || '').split('\\').filter(Boolean);
      let cur = '';
      for (const seg of segments) {
        cur = cur ? `${cur}\\${seg}` : seg;
        const exists = await promisify(client.exists.bind(client))(cur);
        if (!exists) await promisify(client.mkdir.bind(client))(cur);
      }
    },
    disconnect: () => {
      try { client.disconnect(); } catch (e) {}
    },
  };
}

async function listJsEntries(smb, dir, recursive) {
  const names = await smb.readdir(dir);
  const entries = [];

  for (const name of names) {
    if (!name || name === '.' || name === '..') continue;
    const filePath = dir ? `${dir}\\${name}` : name;

    let size = -1;
    let isDir = false;
    try {
      const st = await smb.stat(filePath);
      size = st.size;
      isDir = typeof st.isDirectory === 'function' ? st.isDirectory() : false;
    } catch (e) {
      // 部分服务器不支持 stat，退回 getSize 判断目录
      try {
        size = await smb.getSize(filePath);
      } catch (e2) {
        isDir = true;
      }
    }

    entries.push({
      name,
      path: toPosix(filePath),
      type: isDir ? 'directory' : 'file',
      size: isDir ? null : (size >= 0 ? size : null),
    });

    if (isDir && recursive) {
      entries.push(...(await listJsEntries(smb, filePath, true)));
    }
  }

  return entries;
}

// ===================== 主流程 =====================
async function main() {
  const { args, options } = parseArgs(process.argv.slice(2));

  if (options.version) {
    console.log(`smb-client v${SKILL_VERSION}`);
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (args.length === 0) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const command = args[0].toLowerCase();

  const output = (data) => {
    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      if (typeof data === 'string') {
        console.log(data);
      } else if (Array.isArray(data)) {
        data.forEach((item) => console.log(typeof item === 'object' ? JSON.stringify(item) : item));
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  };

  const outputError = (err) => {
    const errObj = {
      success: false,
      error: err.message || String(err),
      code: err.code || 'UNKNOWN_ERROR',
    };
    const text = options.json ? JSON.stringify(errObj, null, 2) : `[SMB ERROR] ${errObj.error}`;
    // 同步写 stderr，保证 process.exit 前不丢输出
    try { fs.writeSync(2, text + '\n'); } catch (e) { console.error(text); }
    process.exit(1);
  };

  // shares 枚举只依赖 smbclient（纯 JS 引擎无法在无 share 的情况下查询服务器共享）
  if (command === 'shares' || command === 'list-shares') {
    if (!hasSmbClient()) {
      outputError(Object.assign(
        new Error('当前环境未安装 smbclient，纯 JS 引擎无法枚举服务器共享列表。请安装 samba 客户端（smbclient）后重试，或查看已挂载的共享（mount / net use）。'),
        { code: 'SMBCLIENT_REQUIRED' }
      ));
      return;
    }
    try {
      await runViaSmbClient(command, args, options, output);
    } catch (err) {
      outputError(err);
    }
    return;
  }

  // 优先走系统 smbclient；失败或未安装且提供了 share 时回退纯 JS 引擎
  if (hasSmbClient() && options.share) {
    try {
      await runViaSmbClient(command, args, options, output);
      return;
    } catch (err) {
      if (options.json) {
        try {
          fs.writeSync(2, JSON.stringify({
            warning: 'smbclient 引擎执行失败，回退到纯 JS 引擎',
            error: err.message,
            code: err.code || 'SMBCLIENT_ERROR',
          }, null, 2) + '\n');
        } catch (e) {}
      } else {
        console.error(`[smb-client] smbclient 引擎执行失败，回退到纯 JS 引擎: ${err.message}`);
      }
    }
  }

  let smb = null;
  try {
    smb = await createClient(options);
  } catch (err) {
    outputError(err);
    return;
  }

  try {
    switch (command) {
      case 'test': {
        const testPath = normalizeSmbPath(args[1] || options.subpath || '');
        const exists = await smb.exists(testPath);
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          message: 'SMB 共享连接认证成功',
          host: options.host,
          share: options.share,
          user: options.user,
          pathChecked: testPath || '/',
          exists,
        });
        break;
      }

      case 'ls':
      case 'list': {
        const targetDir = normalizeSmbPath(args[1] || options.subpath || '');
        const entries = await listJsEntries(smb, targetDir, options.recursive);
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          path: targetDir ? toPosix(targetDir) : '/',
          count: entries.length,
          entries,
        });
        break;
      }

      case 'stat': {
        const targetPath = normalizeSmbPath(args[1] || options.subpath || '');
        if (!targetPath) throw new Error('缺少参数: 请指定 remotePath');
        const exists = await smb.exists(targetPath);
        if (!exists) {
          throw new Error(`文件或目录不存在: ${targetPath}`);
        }
        let size = null;
        let isDir = false;
        try {
          const st = await smb.stat(targetPath);
          size = st.size;
          isDir = typeof st.isDirectory === 'function' ? st.isDirectory() : false;
        } catch (e) {
          try {
            size = await smb.getSize(targetPath);
          } catch (e2) {
            isDir = true;
          }
        }
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          path: toPosix(targetPath),
          type: isDir ? 'directory' : 'file',
          size: isDir ? null : size,
        });
        break;
      }

      case 'cat':
      case 'read': {
        const targetPath = normalizeSmbPath(args[1] || options.subpath || '');
        if (!targetPath) throw new Error('缺少参数: 请指定 remoteFile');
        let size = null;
        try { size = await smb.getSize(targetPath); } catch (e) {}
        if (size !== null && size > options.maxBytes) {
          throw new Error(`文件大小 (${size} 字节) 超过允许的最大读取上限 (${options.maxBytes} 字节)`);
        }
        const buffer = await smb.readFile(targetPath);
        smb.disconnect();

        if (buffer.length > options.maxBytes) {
          throw new Error(`文件大小 (${buffer.length} 字节) 超过允许的最大读取上限 (${options.maxBytes} 字节)`);
        }

        if (options.json) {
          output({
            success: true,
            engine: 'js',
            path: toPosix(targetPath),
            size: buffer.length,
            content: buffer.toString(options.encoding),
          });
        } else {
          process.stdout.write(buffer.toString(options.encoding));
        }
        break;
      }

      case 'get':
      case 'download': {
        const remotePath = normalizeSmbPath(args[1]);
        const localPath = args[2];
        if (!remotePath || !localPath) throw new Error('用法: get <remoteFile> <localPath>');

        const buffer = await smb.readFile(remotePath);
        const resolvedLocal = path.resolve(localPath);
        fs.mkdirSync(path.dirname(resolvedLocal), { recursive: true });
        fs.writeFileSync(resolvedLocal, buffer);
        smb.disconnect();

        output({
          success: true,
          engine: 'js',
          message: '文件下载成功',
          remotePath: toPosix(remotePath),
          localPath: resolvedLocal,
          bytesDownloaded: buffer.length,
        });
        break;
      }

      case 'put':
      case 'upload': {
        const localPath = args[1];
        const remotePath = normalizeSmbPath(args[2]);
        if (!localPath || !remotePath) throw new Error('用法: put <localPath> <remoteFile>');

        const resolvedLocal = path.resolve(localPath);
        if (!fs.existsSync(resolvedLocal)) {
          throw new Error(`本地文件不存在: ${resolvedLocal}`);
        }
        const buffer = fs.readFileSync(resolvedLocal);

        // 确保远程父目录存在
        const remoteDir = path.dirname(remotePath.replace(/\//g, '\\'));
        if (remoteDir && remoteDir !== '.') {
          try {
            await smb.ensureDir(remoteDir);
          } catch (e) {}
        }

        await smb.writeFile(remotePath, buffer);
        smb.disconnect();

        output({
          success: true,
          engine: 'js',
          message: '文件上传成功',
          localPath: resolvedLocal,
          remotePath: toPosix(remotePath),
          bytesUploaded: buffer.length,
        });
        break;
      }

      case 'mkdir': {
        const targetDir = normalizeSmbPath(args[1]);
        if (!targetDir) throw new Error('用法: mkdir <remoteDir>');
        await smb.ensureDir(targetDir);
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          message: '目录创建成功',
          path: toPosix(targetDir),
        });
        break;
      }

      case 'rm':
      case 'unlink': {
        const targetPath = normalizeSmbPath(args[1]);
        if (!targetPath) throw new Error('用法: rm <remoteFile>');
        await smb.unlink(targetPath);
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          message: '远程文件已删除',
          path: toPosix(targetPath),
        });
        break;
      }

      case 'rmdir': {
        const targetPath = normalizeSmbPath(args[1]);
        if (!targetPath) throw new Error('用法: rmdir <remoteDir>');
        await smb.rmdir(targetPath);
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          message: '远程目录已删除',
          path: toPosix(targetPath),
        });
        break;
      }

      case 'rename':
      case 'mv': {
        const oldPath = normalizeSmbPath(args[1]);
        const newPath = normalizeSmbPath(args[2]);
        if (!oldPath || !newPath) throw new Error('用法: rename <oldPath> <newPath>');
        await smb.rename(oldPath, newPath);
        smb.disconnect();
        output({
          success: true,
          engine: 'js',
          message: '远程文件/目录已重命名',
          from: toPosix(oldPath),
          to: toPosix(newPath),
        });
        break;
      }

      default:
        throw new Error(
          `未知命令: ${command}。支持的命令: test, ls, stat, cat, get, put, mkdir, rm, rmdir, rename, shares`
        );
    }
  } catch (err) {
    if (smb) smb.disconnect();
    outputError(err);
  }
}

main().catch((err) => {
  try { fs.writeSync(2, JSON.stringify({ success: false, error: err.message || String(err), code: err.code || 'UNKNOWN_ERROR' }, null, 2) + '\n'); } catch (e) { console.error(err); }
  process.exit(1);
});
