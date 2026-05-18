/**
 * 输出格式化模块
 * 将思维导图数据格式化为不同展示形式
 */

/**
 * 缩进树形视图
 * 格式: uid: text [标记]
 */
function formatTree(data, indent = 0) {
  if (!data) return "";
  const prefix = "  ".repeat(indent);
  const text = data.data ? data.data.text : (data.text || "");
  const uid = data.data ? data.data.uid : (data.uid || "");

  // 构建标记
  const tags = [];
  if (data.data) {
    if (data.data.expand === false) tags.push("collapsed");
    if (data.data.note) tags.push("note");
    if (data.data.hyperlink) tags.push("link");
    if (data.data.image) tags.push("img");
  }

  const tagStr = tags.length > 0 ? ` [${tags.join(",")}]` : "";
  let result = `${prefix}${uid}: ${text}${tagStr}\n`;

  // 递归处理子节点
  const children = data.children || [];
  for (const child of children) {
    result += formatTree(child, indent + 1);
  }

  return result;
}

/**
 * 统计摘要
 * 返回节点数、最大深度、一级子节点列表
 */
function formatSummary(data) {
  if (!data) return { error: "无数据" };

  const stats = getTreeStats(data);
  const rootText = data.data ? data.data.text : (data.text || "");
  const rootUid = data.data ? data.data.uid : (data.uid || "");

  // 一级子节点
  const children = data.children || [];
  const childList = children.map((c) => {
    const cText = c.data ? c.data.text : (c.text || "");
    const cUid = c.data ? c.data.uid : (c.uid || "");
    const childCount = (c.children || []).length;
    return { uid: cUid, text: cText, children: childCount };
  });

  return {
    root: { uid: rootUid, text: rootText },
    totalNodes: stats.nodes,
    maxDepth: stats.depth,
    topChildren: childList,
  };
}

/**
 * 计算节点数和最大深度
 */
function getTreeStats(data, currentDepth = 1) {
  if (!data) return { nodes: 0, depth: 0 };

  let nodes = 1;
  let depth = currentDepth;

  const children = data.children || [];
  for (const child of children) {
    const childStats = getTreeStats(child, currentDepth + 1);
    nodes += childStats.nodes;
    if (childStats.depth > depth) {
      depth = childStats.depth;
    }
  }

  return { nodes, depth };
}

module.exports = { formatTree, formatSummary, getTreeStats };
