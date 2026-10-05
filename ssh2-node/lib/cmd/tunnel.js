/**
 * tunnel 子命令：远程端口转发（SSH 隧道）
 *
 * 把远程主机可达的目标端口，映射到本地端口。
 * 典型用途：通过跳板机访问内网数据库/内部服务。
 *
 * 用法:
 *   node skill.js tunnel --ssh <连接参数> --local 13306 --remote-host 192.0.2.10 --remote-port 3306
 *   node skill.js tunnel --ssh <连接参数> --local 13306 --remote-host 192.0.2.10 --remote-port 3306 --run "cmd"
 *
 * 默认行为：建立隧道后持续运行（Ctrl+C 退出）。
 * 指定 --run 时：隧道就绪后执行本地命令，命令结束即关闭隧道。
 */

const net = require("net");
const { spawn } = require("child_process");
const { connect } = require("../ssh");
const { resolveSshConfig, validateSshConfig } = require("../env");
const { handleError } = require("../errors");

/**
 * @param {string[]} args - 未使用
 * @param {Object} options
 */
async function cmdTunnel(args, options) {
  const config = resolveSshConfig(options);
  const invalid = validateSshConfig(config);
  if (invalid) {
    handleError(new Error(invalid), "SSH 配置不完整", 2);
    return;
  }

  const localPort = parseInt(options.local, 10);
  const remoteHost = options["remote-host"] || options.remotehost;
  const remotePort = parseInt(options["remote-port"] || options.remoteport, 10);

  if (!localPort) {
    handleError(new Error("缺少 --local（本地监听端口）"), "tunnel 参数不完整", 2);
    return;
  }
  if (!remoteHost || !remotePort) {
    handleError(
      new Error("缺少 --remote-host / --remote-port（目标主机与端口）"),
      "tunnel 参数不完整",
      2
    );
    return;
  }

  let conn;
  try {
    conn = await connect(config);
  } catch (e) {
    handleError(e, "建立 SSH 连接失败");
    return;
  }

  // 本地监听 + forwardOut：只依赖服务器允许直连目标地址，通用性最好
  const server = net.createServer((socket) => {
    conn.forwardOut(
      "127.0.0.1",
      socket.localPort || 0,
      remoteHost,
      remotePort,
      (err, stream) => {
        if (err) {
          socket.end();
          return;
        }
        socket.pipe(stream).pipe(socket);
        socket.on("error", () => stream.close());
        stream.on("error", () => socket.end());
      }
    );
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(localPort, "127.0.0.1", resolve);
  }).catch((e) => {
    handleError(e, `本地端口 ${localPort} 监听失败`);
  });

  const info = {
    tunnel: `127.0.0.1:${localPort} -> ${config.host} -> ${remoteHost}:${remotePort}`,
    localPort,
    remoteHost,
    remotePort,
    sshHost: config.host,
    ready: true,
  };

  // 指定 --run 时执行本地命令，命令退出后关闭隧道
  if (options.run) {
    console.log(JSON.stringify({ ...info, running: options.run }, null, 2));

    const child = spawn(options.run, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => {
      server.close();
      conn.end();
      process.exit(code === null ? 0 : code);
    });
    return;
  }

  console.log(JSON.stringify(info, null, 2));

  const shutdown = () => {
    server.close();
    conn.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

module.exports = { cmdTunnel };
