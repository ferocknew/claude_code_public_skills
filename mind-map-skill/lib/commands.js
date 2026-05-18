const { apiRequest, getConfig } = require("./api");
const { formatTree, formatSummary, searchNodes } = require("./formatter");

/**
 * 解包 API 响应
 * Bridge 返回 { success, data: <tool_result>, error }
 * 其中 tool_result 本身也是 { success, data/message, ... }
 * 这里提取 tool_result 层
 */
function unwrapToolResult(result) {
  if (!result.success) return result;
  const toolResult = result.data;
  if (toolResult && typeof toolResult === "object" && "success" in toolResult) {
    return toolResult;
  }
  return result;
}

/**
 * 通用 exec 命令
 * POST /api/mind-map/exec
 */
async function cmdExec(command, argsJson, opts) {
  let args = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch (e) {
      return { success: false, error: "参数解析失败", message: `JSON 格式错误: ${e.message}` };
    }
  }
  const result = await apiRequest("POST", "/api/mind-map/exec", { command, args }, opts);
  return unwrapToolResult(result);
}

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

  // 解包 bridge 响应，提取 tool_result
  const toolResult = unwrapToolResult(result);
  if (!toolResult.success) {
    return { success: false, error: "读取失败", message: toolResult.message || "未知错误" };
  }

  const format = opts.format || "tree";
  const data = toolResult.data;

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
  const result = await apiRequest("POST", "/api/mind-map/add_node", body, opts);
  return unwrapToolResult(result);
}

/**
 * 删除节点
 * POST /api/mind-map/delete_node
 */
async function cmdDelete(uid, opts) {
  const result = await apiRequest("POST", "/api/mind-map/delete_node", { uid }, opts);
  return unwrapToolResult(result);
}

/**
 * 更新节点文本
 * POST /api/mind-map/update_node
 */
async function cmdUpdate(uid, text, opts) {
  const result = await apiRequest("POST", "/api/mind-map/update_node", { uid, text }, opts);
  return unwrapToolResult(result);
}

/**
 * 从 JSON 文件覆盖整图
 * POST /api/mind-map/overwrite
 */
async function cmdWrite(jsonFile, opts) {
  const fs = require("fs");

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

  const result = await apiRequest("POST", "/api/mind-map/overwrite", { data }, opts);
  return unwrapToolResult(result);
}

// ===================== 高级命令（通过 /exec 接口） =====================

/**
 * 移动节点到目标节点下
 */
async function cmdMove(uid, targetUid, opts) {
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "MOVE_NODE_TO", args: { uid, targetUid },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 上移节点
 */
async function cmdUp(uid, opts) {
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "UP_NODE", args: { uid },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 下移节点
 */
async function cmdDown(uid, opts) {
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "DOWN_NODE", args: { uid },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 插入同级节点
 */
async function cmdInsert(uid, text, opts) {
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "INSERT_NODE",
    args: { uid, appointData: { text, richText: true } },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 插入父级节点
 */
async function cmdInsertParent(uid, text, opts) {
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "INSERT_PARENT_NODE",
    args: { uid, appointData: { text, richText: true } },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 设置节点备注
 */
async function cmdNote(uid, note, opts) {
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "SET_NODE_NOTE", args: { uid, note },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 设置节点超链接
 */
async function cmdLink(uid, link, opts) {
  const title = opts.title || "";
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "SET_NODE_HYPERLINK", args: { uid, link, title },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 撤销
 */
async function cmdUndo(opts) {
  const step = parseInt(opts.step) || 1;
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "BACK", args: { step },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 重做
 */
async function cmdRedo(opts) {
  const step = parseInt(opts.step) || 1;
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command: "FORWARD", args: { step },
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 展开节点
 */
async function cmdExpand(uid, opts) {
  const args = uid ? { uid, expand: true } : {};
  const command = uid ? "SET_NODE_EXPAND" : "EXPAND_ALL";
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command, args,
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 收起节点
 */
async function cmdCollapse(uid, opts) {
  const args = uid ? { uid, expand: false } : {};
  const command = uid ? "SET_NODE_EXPAND" : "UNEXPAND_ALL";
  const result = await apiRequest("POST", "/api/mind-map/exec", {
    command, args,
  }, opts);
  return unwrapToolResult(result);
}

/**
 * 搜索节点（本地搜索，读取全量后过滤）
 */
async function cmdSearch(keyword, opts) {
  const result = await apiRequest("GET", "/api/mind-map/read", null, opts);

  if (!result.success) return result;

  const toolResult = unwrapToolResult(result);
  if (!toolResult.success) {
    return { success: false, error: "搜索失败", message: toolResult.message || "未知错误" };
  }

  const data = toolResult.data;
  const matches = searchNodes(data, keyword);

  return {
    success: true,
    keyword,
    totalMatches: matches.length,
    results: matches.map((m) => ({
      uid: m.uid,
      text: m.text,
      path: m.path.join(" > "),
    })),
  };
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

module.exports = {
  cmdStatus, cmdRead, cmdAdd, cmdDelete, cmdUpdate, cmdWrite, cmdConfig,
  cmdExec, cmdMove, cmdUp, cmdDown, cmdInsert, cmdInsertParent,
  cmdNote, cmdLink, cmdUndo, cmdRedo, cmdExpand, cmdCollapse, cmdSearch,
};
