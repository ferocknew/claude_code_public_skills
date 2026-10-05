/**
 * shell 子命令：在远程主机执行多条命令（同一会话）
 *
 * 用 exec 逐条执行，但共享一次连接，避免反复建连。
 * 与 exec 的差别：按顺序执行命令数组，遇错可选择继续。
 *
 * 用法:
 *   node skill.js shell "cmd1" "cmd2" ... --ssh <连接参数>
 */

const { withConnection, exec } = require("../ssh");
const { resolveSshConfig, validateSshConfig } = require("../env");
const { handleError } = require("../errors");

/**
 * @param {string[]} args - 位置参数（每一项是一条命令）
 * @param {Object} options - 命令行选项
 */
async function cmdShell(args, options) {
  const commands = args.filter((a) => a && a.trim());
  if (commands.length === 0) {
    handleError(new Error("缺少要执行的命令"), "shell 需要至少一条命令", 2);
    return;
  }

  const config = resolveSshConfig(options);
  const invalid = validateSshConfig(config);
  if (invalid) {
    handleError(new Error(invalid), "SSH 配置不完整", 2);
    return;
  }

  // 默认遇错即停，--keep-going 时继续执行剩余命令
  const keepGoing = !!options["keep-going"] || !!options.keepgoing;

  try {
    const results = await withConnection(config, async (conn) => {
      const out = [];
      for (const command of commands) {
        const r = await exec(conn, command, {
          cwd: options.cwd,
          pty: !!options.pty,
          timeout: options.timeout,
        });
        out.push({
          command,
          stdout: r.stdout,
          stderr: r.stderr,
          code: r.code,
        });
        if (r.code !== 0 && !keepGoing) break;
      }
      return out;
    });

    console.log(
      JSON.stringify(
        { host: config.host, total: commands.length, results },
        null,
        2
      )
    );

    const failed = results.find((r) => r.code !== 0);
    if (failed) process.exit(failed.code === null ? 1 : failed.code);
  } catch (e) {
    handleError(e, "执行远程命令失败");
  }
}

module.exports = { cmdShell };
