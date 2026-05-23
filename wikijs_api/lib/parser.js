/**
 * 命令行参数解析
 */

/**
 * 解析命令行参数
 * @param {string[]} args - 参数数组
 * @returns {Object} { positional: string[], options: Object }
 */
function parseArgs(args) {
  const options = {};
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        options[key] = value;
        i++;
      } else {
        options[key] = true;
      }
    } else if (args[i].startsWith("-")) {
      options[args[i].slice(1)] = true;
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, options };
}

module.exports = {
  parseArgs
};