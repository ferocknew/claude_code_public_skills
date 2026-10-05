/**
 * 命令行参数解析
 *
 * 支持形式:
 *   --key value     普通选项
 *   --flag          布尔选项
 *   -h / -v         短选项
 *
 * 未知位置参数按出现顺序收集到 positional。
 */

/**
 * 解析命令行参数
 * @param {string[]} args - 参数数组
 * @returns {{positional: string[], options: Object}}
 */
function parseArgs(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      // 之后所有参数都视为位置参数
      positional.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2).toLowerCase();
      const value = args[i + 1];
      if (value !== undefined && !value.startsWith("--")) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      options[arg.slice(1).toLowerCase()] = true;
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

module.exports = { parseArgs };
