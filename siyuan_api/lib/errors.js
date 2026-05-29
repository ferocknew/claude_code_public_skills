/**
 * 错误处理
 */

/**
 * 处理错误并显示友好提示
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文
 */
function handleError(error, context = "") {
  console.error(`❌ 错误: ${context}`);
  if (error) {
    console.error(error.message);
  }

  // 检查常见错误代码
  const msg = error ? error.message : "";
  if (msg.includes("401") || msg.includes("403")) {
    console.error("\n💡 提示: 请检查 API Token 是否正确");
    console.error("   思源笔记 Token 获取: 设置 > 关于 > API Token");
  } else if (msg.includes("404")) {
    console.error("\n💡 提示: 请检查思源笔记服务地址是否正确");
  } else if (msg.includes("ECONNREFUSED")) {
    console.error("\n💡 提示: 无法连接到思源笔记服务器，请确认服务已启动");
    console.error("   默认地址: http://127.0.0.1:6806");
  } else if (msg.includes("code: -1") || (error && error.isSiyuanError)) {
    console.error("\n💡 提示: 思源笔记 API 返回错误，请检查请求参数");
  }

  process.exit(1);
}

module.exports = {
  handleError
};
