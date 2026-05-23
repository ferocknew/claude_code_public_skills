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
    console.error("\n💡 提示: 请检查 API Token 是否正确且有足够的权限");
  } else if (msg.includes("404")) {
    console.error("\n💡 提示: 请检查 Wiki.js URL 是否正确");
  } else if (msg.includes("ECONNREFUSED")) {
    console.error("\n💡 提示: 无法连接到 Wiki.js 服务器");
  }

  process.exit(1);
}

module.exports = {
  handleError
};