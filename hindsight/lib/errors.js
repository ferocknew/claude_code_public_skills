/**
 * 统一错误结构：{ error, message, hint? }
 *
 * 退出码约定：
 *   0  成功
 *   1  运行时错误（网络、MCP 服务端返回错误）
 *   2  用法 / 配置错误（参数不合法、缺少 HINDSIGHT_MCP_URL 等）
 *
 * 命令函数可以抛出 SkillError；run.js 统一捕获并输出 JSON，不打印堆栈。
 */

const EXIT_CODES = {
  OK: 0,
  RUNTIME: 1,
  USAGE: 2,
};

/**
 * 带标题与退出码的业务错误
 */
class SkillError extends Error {
  /**
   * @param {string} message 错误详情（中文）
   * @param {{title?:string,exitCode?:number,status?:number,hint?:string}} [options]
   */
  constructor(message, options) {
    super(message);
    const opts = options || {};
    this.name = "SkillError";
    this.title = opts.title || "执行失败";
    this.exitCode = opts.exitCode === undefined ? EXIT_CODES.RUNTIME : opts.exitCode;
    if (opts.status !== undefined) this.status = opts.status;
    if (opts.hint) this.hint = opts.hint;
  }
}

/**
 * 用法错误（退出码 2）
 * @param {string} message
 * @param {string} [hint]
 * @returns {SkillError}
 */
function usageError(message, hint) {
  return new SkillError(message, { title: "参数错误", exitCode: EXIT_CODES.USAGE, hint });
}

/**
 * 配置缺失 / 配置非法（退出码 2）
 * @param {string} message
 * @param {string} [hint]
 * @returns {SkillError}
 */
function configError(message, hint) {
  return new SkillError(message, { title: "配置错误", exitCode: EXIT_CODES.USAGE, hint });
}

/**
 * 运行时错误（退出码 1）
 * @param {string} message
 * @param {{title?:string,status?:number,hint?:string}} [options]
 * @returns {SkillError}
 */
function runtimeError(message, options) {
  return new SkillError(message, Object.assign({}, options, { exitCode: EXIT_CODES.RUNTIME }));
}

/**
 * 把任意异常转成可输出的 JSON 载荷
 * @param {Error|string} error
 * @param {string} [context] 出错命令
 * @returns {Object}
 */
function toPayload(error, context) {
  const isSkill = error instanceof SkillError;
  const message = error instanceof Error ? error.message : String(error);
  const payload = {
    error: isSkill ? error.title : context || "执行失败",
    message,
  };
  if (isSkill && error.status !== undefined) payload.status = error.status;
  if (isSkill && error.hint) payload.hint = error.hint;
  return payload;
}

/**
 * 输出错误 JSON 到 stderr
 * @param {Error|string} error
 * @param {string} [context]
 */
function printError(error, context) {
  console.error(JSON.stringify(toPayload(error, context), null, 2));
}

/**
 * 输出错误并返回退出码（不直接退出，便于 finally 清理会话）
 * @param {Error|string} error
 * @param {string} [context]
 * @returns {number}
 */
function handleError(error, context) {
  printError(error, context);
  if (error instanceof SkillError && typeof error.exitCode === "number") return error.exitCode;
  return EXIT_CODES.RUNTIME;
}

module.exports = {
  EXIT_CODES,
  SkillError,
  usageError,
  configError,
  runtimeError,
  toPayload,
  printError,
  handleError,
};
