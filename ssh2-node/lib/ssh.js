/**
 * SSH 连接封装
 *
 * 把 ssh2 的回调/事件式 API 包装成 Promise，供各子命令复用。
 */

const fs = require("fs");
const { Client } = require("ssh2");

/**
 * 读取私钥内容，并把路径字段转成 ssh2 需要的 privateKey
 * @param {Object} config - resolveSshConfig 产出的配置
 * @returns {Object} 可直接传给 client.connect 的配置
 */
function materializeConfig(config) {
  const out = { ...config };
  if (out._privateKeyPath) {
    try {
      out.privateKey = fs.readFileSync(out._privateKeyPath);
    } catch (e) {
      throw new Error(`读取私钥失败: ${out._privateKeyPath} (${e.message})`);
    }
    delete out._privateKeyPath;
  }
  return out;
}

/**
 * 建立 SSH 连接
 * @param {Object} config - resolveSshConfig 产出的配置
 * @returns {Promise<Client>} 已就绪的连接
 */
function connect(config) {
  return new Promise((resolve, reject) => {
    let connConfig;
    try {
      connConfig = materializeConfig(config);
    } catch (e) {
      reject(e);
      return;
    }

    const conn = new Client();

    conn.on("ready", () => resolve(conn));
    conn.on("error", (err) => reject(err));
    conn.on("keyboard-interactive", (name, instructions, lang, prompts, finish) => {
      // 服务器要求 keyboard-interactive 时，用密码回答第一个提示
      if (!connConfig.password) {
        reject(new Error("服务器要求 keyboard-interactive 认证，但未提供密码"));
        return;
      }
      finish([connConfig.password]);
    });

    try {
      conn.connect(connConfig);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 建立连接、执行回调、确保关闭
 * @param {Object} config
 * @param {(conn: Client) => Promise<any>} fn
 * @returns {Promise<any>}
 */
async function withConnection(config, fn) {
  const conn = await connect(config);
  try {
    return await fn(conn);
  } finally {
    conn.end();
  }
}

/**
 * 在已就绪的连接上执行命令
 * @param {Client} conn
 * @param {string} command
 * @param {Object} opts - { cwd, pty, timeout, env }
 * @returns {Promise<{stdout: string, stderr: string, code: number|null, signal: string|null}>}
 */
function exec(conn, command, opts = {}) {
  return new Promise((resolve, reject) => {
    const execOpts = {};
    if (opts.pty) execOpts.pty = true;
    if (opts.env) execOpts.env = opts.env;

    const timeoutMs = parseInt(opts.timeout || "0", 10);

    const onReady = (err, stream) => {
      if (err) {
        reject(err);
        return;
      }

      let stdout = "";
      let stderr = "";
      let settled = false;

      let timer = null;
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          stream.close();
          reject(new Error(`命令执行超时（${timeoutMs}ms）`));
        }, timeoutMs);
      }

      stream.on("data", (d) => {
        stdout += d.toString();
      });
      stream.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      stream.on("close", (code, signal) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({ stdout, stderr, code: code === undefined ? null : code, signal: signal || null });
      });
    };

    if (opts.cwd) {
      // 用 shell 包装以支持工作目录，保持退出码语义
      const wrapped = `cd ${shellQuote(opts.cwd)} && ${command}`;
      conn.exec(wrapped, execOpts, onReady);
    } else {
      conn.exec(command, execOpts, onReady);
    }
  });
}

/**
 * 单引号包裹并转义，用于安全拼接 shell 命令
 * @param {string} s
 * @returns {string}
 */
function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/**
 * 获取 SFTP 会话
 * @param {Client} conn
 * @returns {Promise<import('ssh2').SFTPWrapper>}
 */
function sftp(conn) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) reject(err);
      else resolve(sftp);
    });
  });
}

module.exports = { connect, withConnection, exec, sftp, shellQuote, materializeConfig };
