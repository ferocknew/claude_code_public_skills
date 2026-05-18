const { apiRequest, getConfig } = require("./api");
const { formatTree, formatSummary } = require("./formatter");

/**
 * 检查浏览器连接状态
 * GET /api/mind-map/status
 */
async function cmdStatus(opts) {
  return apiRequest("GET", "/api/mind-map/status", null, opts);
}

/**
 * 读取思维导图
 * GET /api/mind-map/read
 */
async function cmdRead(opts) {
  const result = await apiRequest("GET", "/api/mind-map/read", null, opts);

  if (!result.success) return result;

  const format = opts.format || "tree";
  const data = result.data;

  switch (format) {
    case "tree":
      return { success: true, format: "tree", tree: formatTree(data).trimEnd() };
    case "summary":
      return { success: true, format: "summary", ...formatSummary(data) };
    case "json":
      return { success: true, format: "json", data };
    default:
      return { success: true, format: "tree", tree: formatTree(data).trimEnd() };
  }
}

/**
 * 添加子节点
 * POST /api/mind-map/add_node
 */
async function cmdAdd(text, opts) {
  const body = { text };
  if (opts.parent) {
    body.parentUid = opts.parent;
  }
  return apiRequest("POST", "/api/mind-map/add_node", body, opts);
}

/**
 * 删除节点
 * POST /api/mind-map/delete_node
 */
async function cmdDelete(uid, opts) {
  return apiRequest("POST", "/api/mind-map/delete_node", { uid }, opts);
}

/**
 * 更新节点文本
 * POST /api/mind-map/update_node
 */
async function cmdUpdate(uid, text, opts) {
  return apiRequest("POST", "/api/mind-map/update_node", { uid, text }, opts);
}

/**
 * 从 JSON 文件覆盖整图
 * POST /api/mind-map/overwrite
 */
async function cmdWrite(jsonFile, opts) {
  const fs = require("fs");
  const path = require("path");

  if (!fs.existsSync(jsonFile)) {
    return { success: false, error: "文件不存在", message: `找不到文件: ${jsonFile}` };
  }

  let data;
  try {
    const content = fs.readFileSync(jsonFile, "utf8");
    data = JSON.parse(content);
  } catch (e) {
    return { success: false, error: "解析失败", message: `JSON 解析错误: ${e.message}` };
  }

  return apiRequest("POST", "/api/mind-map/overwrite", { data }, opts);
}

/**
 * 显示当前配置（不调用 API）
 */
function cmdConfig() {
  const config = getConfig();
  return {
    url: config.url,
    token: config.token ? "***" + config.token.slice(-4) : "(未设置)",
    rejectUnauthorized: config.rejectUnauthorized,
  };
}

module.exports = { cmdStatus, cmdRead, cmdAdd, cmdDelete, cmdUpdate, cmdWrite, cmdConfig };
