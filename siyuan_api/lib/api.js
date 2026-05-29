/**
 * 思源笔记 REST API 客户端
 *
 * 思源笔记所有接口均为 POST，返回统一格式:
 * { code: 0, msg: "", data: ... }
 * code 非 0 为异常
 */

const fetch = require("node-fetch");

/**
 * 发送 POST 请求到思源笔记 API
 * @param {string} url - 思源笔记基础 URL（如 http://127.0.0.1:6806）
 * @param {string} token - API Token
 * @param {string} apiPath - API 路径（如 /api/notebook/lsNotebooks）
 * @param {Object} params - 请求参数
 * @returns {Promise<any>} data 字段内容
 */
async function siyuanPost(url, token, apiPath, params = {}) {
  const endpoint = url.replace(/\/$/, "") + apiPath;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${token}`
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    const err = new Error(`思源 API 错误 (code: ${result.code}): ${result.msg}`);
    err.isSiyuanError = true;
    err.code = result.code;
    throw err;
  }

  return result.data;
}

module.exports = {
  siyuanPost
};
