/**
 * 通用工具函数
 */

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.escapeRegExp = escapeRegExp;
