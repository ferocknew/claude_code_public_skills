/**
 * 命令行参数解析
 *
 * 支持形式:
 *   --key value     普通选项（key 统一转小写）
 *   --flag          布尔选项
 *   -h / -v         短选项
 *   --              其后全部视为位置参数
 */

/**
 * @param {string[]} args - process.argv.slice(2)
 * @returns {{positional: string[], options: Object}}
 */
function parseArgs(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2).toLowerCase();
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      // 短选项统一按小写字母归入 options，-v 这类不再被当成位置参数
      options[arg.slice(1).toLowerCase()] = true;
    } else {
      positional.push(arg);
    }
  }

  return { positional, options };
}

module.exports = { parseArgs };
