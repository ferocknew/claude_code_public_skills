/**
 * sftp 子命令：文件传输与远程文件系统操作
 *
 * 用法:
 *   node skill.js sftp put <本地路径> <远程路径> --ssh <连接参数>
 *   node skill.js sftp get <远程路径> <本地路径> --ssh <连接参数>
 *   node skill.js sftp ls <远程目录> --ssh <连接参数>
 *   node skill.js sftp mkdir <远程目录> --ssh <连接参数>
 *   node skill.js sftp rm <远程路径> --ssh <连接参数>
 *   node skill.js sftp stat <远程路径> --ssh <连接参数>
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { withConnection, sftp } = require("../ssh");
const { resolveSshConfig, validateSshConfig } = require("../env");
const { handleError } = require("../errors");

/**
 * Git Bash/MSYS 会在 node 启动前把 / 开头的参数改写成 Windows 路径。
 * 按 MSYS 默认挂载映射还原，避免远端 /tmp 被当成 C:/Users/.../Temp。
 */
function normalizeRemotePath(p) {
  if (!p || process.platform !== "win32" || !process.env.MSYSTEM) return p;

  const win = p.replace(/\//g, "\\");
  const lower = win.toLowerCase();

  const tmpRoot = path.win32.normalize(os.tmpdir());
  const tmpLower = tmpRoot.toLowerCase();
  if (lower === tmpLower) return "/tmp";
  if (lower.startsWith(`${tmpLower}\\`)) {
    return `/tmp/${win.slice(tmpRoot.length + 1).replace(/\\/g, "/")}`;
  }

  if (process.env.EXEPATH) {
    const exeRoot = path.win32.normalize(path.win32.dirname(process.env.EXEPATH));
    const rootLower = exeRoot.toLowerCase();
    if (lower === rootLower) return "/";
    if (lower.startsWith(`${rootLower}\\`)) {
      return `/${win.slice(exeRoot.length + 1).replace(/\\/g, "/")}`;
    }
  }

  return p;
}

/**
 * 递归上传目录或上传单文件
 * @param {import('ssh2').SFTPWrapper} sftp
 * @param {string} local
 * @param {string} remote
 * @returns {Promise<{files: string[], bytes: number}>}
 */
async function putPath(sftp, local, remote) {
  const stat = fs.statSync(local);

  if (stat.isDirectory()) {
    const files = [];
    let bytes = 0;
    const walk = async (srcDir, dstDir) => {
      await ensureDir(sftp, dstDir);
      for (const entry of fs.readdirSync(srcDir)) {
        const src = path.join(srcDir, entry);
        const dst = path.posix.join(dstDir, entry);
        const s = fs.statSync(src);
        if (s.isDirectory()) {
          await walk(src, dst);
        } else {
          await fastPut(sftp, src, dst);
          files.push(dst);
          bytes += s.size;
        }
      }
    };
    await walk(local, remote);
    return { files, bytes };
  }

  const target = await resolvePutTarget(sftp, local, remote);
  const parent = path.posix.dirname(target);
  if (parent && parent !== ".") await ensureDir(sftp, parent);
  await fastPut(sftp, local, target);
  return { files: [target], bytes: stat.size };
}

/**
 * 计算单文件上传的最终远端路径：
 * 目标是已存在目录或以 / 结尾时，追加本地文件名。
 */
async function resolvePutTarget(sftp, local, remote) {
  const name = path.basename(local);
  if (remote.endsWith("/")) return path.posix.join(remote, name);

  try {
    const st = await statRemote(sftp, remote);
    if (st.isDirectory()) return path.posix.join(remote, name);
  } catch (e) {
    // SSH_FX_NO_SUCH_FILE：目标文件尚不存在，按原路径上传
    if (e.code !== 2) throw e;
  }

  return remote;
}

/**
 * 单文件上传（Promise 化）
 */
function fastPut(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * 单文件下载（Promise 化）
 */
function fastGet(sftp, remote, local) {
  return new Promise((resolve, reject) => {
    sftp.fastGet(remote, local, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * 确保远程目录存在（递归创建，已存在不报错）
 */
async function ensureDir(sftp, dir) {
  const parts = dir.split("/").filter(Boolean);
  let cur = dir.startsWith("/") ? "" : ".";
  for (const p of parts) {
    cur = `${cur}/${p}`;
    await new Promise((resolve, reject) => {
      sftp.mkdir(cur, (err) => {
        // 已存在（4 = SSH_FX_FAILURE）时忽略
        if (err && err.code !== 4) reject(err);
        else resolve();
      });
    });
  }
}

/**
 * 列出目录
 */
function readdir(sftp, dir) {
  return new Promise((resolve, reject) => {
    sftp.readdir(dir, (err, list) => (err ? reject(err) : resolve(list)));
  });
}

/**
 * 获取文件属性
 */
function statRemote(sftp, target) {
  return new Promise((resolve, reject) => {
    sftp.stat(target, (err, st) => (err ? reject(err) : resolve(st)));
  });
}

/**
 * 删除文件或空目录
 */
function unlinkRemote(sftp, target) {
  return new Promise((resolve, reject) => {
    sftp.unlink(target, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * 递归下载目录或下载单文件
 * @param {import('ssh2').SFTPWrapper} sftp
 * @param {string} remote
 * @param {string} local
 * @returns {Promise<{files: string[], bytes: number}>}
 */
async function getPath(sftp, remote, local) {
  const st = await statRemote(sftp, remote);

  // SFTP 属性：isDirectory() 由 ssh2 提供
  if (typeof st.isDirectory === "function" && st.isDirectory()) {
    const files = [];
    let bytes = 0;
    const walk = async (srcDir, dstDir) => {
      fs.mkdirSync(dstDir, { recursive: true });
      const list = await readdir(sftp, srcDir);
      for (const item of list) {
        if (item.filename === "." || item.filename === "..") continue;
        const src = path.posix.join(srcDir, item.filename);
        const dst = path.join(dstDir, item.filename);
        if (item.attrs && typeof item.attrs.isDirectory === "function" && item.attrs.isDirectory()) {
          await walk(src, dst);
        } else {
          await fastGet(sftp, src, dst);
          files.push(dst);
          bytes += item.attrs ? item.attrs.size : 0;
        }
      }
    };
    await walk(remote, local);
    return { files, bytes };
  }

  const target = resolveGetTarget(remote, local);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await fastGet(sftp, remote, target);
  return { files: [target], bytes: st.size || 0 };
}

/**
 * 计算单文件下载的最终本地路径：
 * 本地目标是已存在目录或以 /、\ 结尾时，追加远端文件名。
 */
function resolveGetTarget(remote, local) {
  const name = path.posix.basename(remote);
  if (local.endsWith("/") || local.endsWith("\\")) return path.join(local, name);

  try {
    if (fs.statSync(local).isDirectory()) return path.join(local, name);
  } catch (e) {
    // 本地路径不存在，按原路径处理
  }

  return local;
}

/**
 * @param {string[]} args - [subcommand, ...params]
 * @param {Object} options
 */
async function cmdSftp(args, options) {
  const sub = args[0];
  if (!sub) {
    handleError(new Error("缺少 sftp 子命令"), "用法: sftp <put|get|ls|mkdir|rm|stat>", 2);
    return;
  }

  const config = resolveSshConfig(options);
  const invalid = validateSshConfig(config);
  if (invalid) {
    handleError(new Error(invalid), "SSH 配置不完整", 2);
    return;
  }

  const params = args.slice(1);

  try {
    const output = await withConnection(config, async (conn) => {
      const session = await sftp(conn);

      switch (sub) {
        case "put": {
          const [local, remote] = params;
          if (!local || !remote) throw new Error("用法: sftp put <本地路径> <远程路径>");
          if (!fs.existsSync(local)) throw new Error(`本地路径不存在: ${local}`);
          const remoteTarget = normalizeRemotePath(remote);
          const r = await putPath(session, local, remoteTarget);
          return { action: "put", local, remote: remoteTarget, uploaded: r.files.length, bytes: r.bytes, files: r.files };
        }

        case "get": {
          const [remote, local] = params;
          if (!remote || !local) throw new Error("用法: sftp get <远程路径> <本地路径>");
          const remoteSource = normalizeRemotePath(remote);
          const r = await getPath(session, remoteSource, local);
          return { action: "get", remote: remoteSource, local, downloaded: r.files.length, bytes: r.bytes, files: r.files };
        }

        case "ls": {
          const dir = normalizeRemotePath(params[0] || ".");
          const list = await readdir(session, dir);
          const entries = list
            .filter((i) => i.filename !== "." && i.filename !== "..")
            .map((i) => ({
              name: i.filename,
              type: i.attrs && i.attrs.isDirectory && i.attrs.isDirectory() ? "dir" : "file",
              size: i.attrs ? i.attrs.size : 0,
              mtime: i.attrs ? i.attrs.mtime : null,
            }));
          return { action: "ls", dir, count: entries.length, entries };
        }

        case "mkdir": {
          const rawDir = params[0];
          if (!rawDir) throw new Error("用法: sftp mkdir <远程目录>");
          const dir = normalizeRemotePath(rawDir);
          await ensureDir(session, dir);
          return { action: "mkdir", dir, ok: true };
        }

        case "rm": {
          const rawTarget = params[0];
          if (!rawTarget) throw new Error("用法: sftp rm <远程路径>");
          const target = normalizeRemotePath(rawTarget);
          await unlinkRemote(session, target);
          return { action: "rm", target, ok: true };
        }

        case "stat": {
          const rawTarget = params[0];
          if (!rawTarget) throw new Error("用法: sftp stat <远程路径>");
          const target = normalizeRemotePath(rawTarget);
          const st = await statRemote(session, target);
          return {
            action: "stat",
            target,
            size: st.size,
            mode: st.mode,
            mtime: st.mtime,
            isDirectory: typeof st.isDirectory === "function" ? st.isDirectory() : false,
          };
        }

        default:
          throw new Error(`未知 sftp 子命令: ${sub}`);
      }
    });

    console.log(JSON.stringify(output, null, 2));
  } catch (e) {
    handleError(e, `sftp ${sub} 失败`);
  }
}

module.exports = { cmdSftp };
