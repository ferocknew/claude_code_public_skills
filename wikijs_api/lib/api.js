/**
 * GraphQL API 客户端
 */

const GRAPHQL_ENDPOINT = "/graphql";

/**
 * 执行 GraphQL 查询
 * @param {string} url - Wiki.js 基础 URL
 * @param {string} token - API Token
 * @param {string} query - GraphQL 查询
 * @param {Object} variables - GraphQL 变量
 * @returns {Promise<Object>} 查询结果
 */
async function graphqlQuery(url, token, query, variables = {}) {
  const endpoint = url.replace(/\/$/, "") + GRAPHQL_ENDPOINT;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`GraphQL 错误: ${result.errors[0].message}`);
  }

  return result.data;
}

module.exports = {
  graphqlQuery
};