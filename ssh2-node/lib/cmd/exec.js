/**
 * exec 子命令：在远程主机执行命令
 *
 * 用法:
 *   node skill.js exec <command> --ssh <连接参数> [options]
 */

const { withConnection, exec } = require("../ssh");
const { resolveSshConfig, validateSshConfig } = require("../env");
const { handleError } = require("../errors");

/**
 * @param {string[]} args - 位置参数（第一个是命令）
 * @param {Object} options - 命令行选项
 */
async function cmdExec(args, options) {
  const command = args[0];
  if (!command) {
    handleError(new Error("缺少要执行的命令"), "exec 需要命令参数", 2);
    return;
  }

  const config = resolveSshConfig(options);
  const invalid = validateSshConfig(config);
  if (invalid) {
    handleError(new Error(invalid), "SSH 配置不完整", 2);
    return;
  }

  try {
    const result = await withConnection(config, (conn) =>
      exec(conn, command, {
        cwd: options.cwd,
        pty: !!options.pty,
        timeout: options.timeout,
      })
    );

    // 统一 JSON 输出，便于 LLM 解析
    console.log(
      JSON.stringify(
        {
          command,
          host: config.host,
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          signal: result.signal,
        },
        null,
        2
      )
    );

    // 非零退出码 → 非零进程退出码，但仍已输出完整 JSON
    if (result.code !== 0) process.exit(result.code === null ? 1 : result.code);
  } catch (e) {
    handleError(e, "执行远程命令失败");
  }
}

module.exports = { cmdExec };
