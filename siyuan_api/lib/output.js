/**
 * 输出格式化
 */

const yaml = require("js-yaml");

/**
 * 格式化输出
 * @param {*} data - 要输出的数据
 * @param {string} format - 输出格式 (json/yaml/table/default)
 */
function formatOutput(data, format = "json") {
  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
  } else if (format === "yaml") {
    console.log(yaml.dump(data, { lineWidth: -1, noRefs: true }));
  } else if (format === "table") {
    console.table(data);
  } else {
    console.log(data);
  }
}

/**
 * 输出成功消息
 * @param {string} message - 成功消息
 * @param {Object} details - 详细信息
 */
function showSuccess(message, details = {}) {
  console.log(`✅ ${message}`);
  Object.entries(details).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

/**
 * 输出错误消息
 * @param {string} message - 错误消息
 * @param {Object} details - 详细信息
 */
function showError(message, details = {}) {
  console.error(`❌ ${message}`);
  Object.entries(details).forEach(([key, value]) => {
    console.error(`   ${key}: ${value}`);
  });
}

module.exports = {
  formatOutput,
  showSuccess,
  showError
};
