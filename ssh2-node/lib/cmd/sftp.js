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
const path = require("path");
const { withConnection, sftp } = require("../ssh");
const { resolveSshConfig, validateSshConfig } = require("../env");
const { handleError } = require("../errors");

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

  await fastPut(sftp, local, remote);
  return { files: [remote], bytes: stat.size };
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

  fs.mkdirSync(path.dirname(local), { recursive: true });
  await fastGet(sftp, remote, local);
  return { files: [local], bytes: st.size || 0 };
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
          const r = await putPath(session, local, remote);
          return { action: "put", local, remote, uploaded: r.files.length, bytes: r.bytes, files: r.files };
        }

        case "get": {
          const [remote, local] = params;
          if (!remote || !local) throw new Error("用法: sftp get <远程路径> <本地路径>");
          const r = await getPath(session, remote, local);
          return { action: "get", remote, local, downloaded: r.files.length, bytes: r.bytes, files: r.files };
        }

        case "ls": {
          const dir = params[0] || ".";
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
          const dir = params[0];
          if (!dir) throw new Error("用法: sftp mkdir <远程目录>");
          await ensureDir(session, dir);
          return { action: "mkdir", dir, ok: true };
        }

        case "rm": {
          const target = params[0];
          if (!target) throw new Error("用法: sftp rm <远程路径>");
          await unlinkRemote(session, target);
          return { action: "rm", target, ok: true };
        }

        case "stat": {
          const target = params[0];
          if (!target) throw new Error("用法: sftp stat <远程路径>");
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
