/**
 * 统一错误结构：{ error, message }
 *
 * 所有命令函数永不抛异常，失败时返回该结构，由 run.js 决定退出码。
 */

// 退出码约定
const EXIT_CODES = {
  OK: 0, // 成功
  USAGE: 2, // 用法错误（参数不合法）
  API: 1, // 接口调用失败
  NO_KEY: 3, // 缺少 API Key
};

/**
 * 构造统一错误对象
 * @param {string} error 错误标题（中文短句）
 * @param {string} message 错误详情
 * @param {object} [extra] 附加字段，如 status
 */
function makeError(error, message, extra) {
  return Object.assign({ error, message }, extra || {});
}

/**
 * 打印错误对象，与仓库其他 skill 保持一致的 JSON 输出
 * @param {{error:string,message:string}} errObj
 */
function printError(errObj) {
  console.log(JSON.stringify(errObj, null, 2));
}

module.exports = { makeError, printError, EXIT_CODES };
