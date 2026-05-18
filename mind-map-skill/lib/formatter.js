/**
 * 输出格式化模块
 * 将思维导图数据格式化为不同展示形式
 */

/**
 * 去除 HTML 标签（simple-mind-map 富文本格式）
 * <p><span>文本</span></p> → 文本
 */
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * 获取节点的纯文本
 */
function getNodeText(data) {
  const raw = data.data ? data.data.text : (data.text || "");
  return stripHtml(raw);
}

/**
 * 获取节点 UID
 */
function getNodeUid(data) {
  return data.data ? data.data.uid : (data.uid || "");
}

/**
 * 缩进树形视图
 * 格式: uid: text [标记]
 */
function formatTree(data, indent = 0) {
  if (!data) return "";
  const prefix = "  ".repeat(indent);
  const text = getNodeText(data);
  const uid = getNodeUid(data);

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
  const rootText = getNodeText(data);
  const rootUid = getNodeUid(data);

  // 一级子节点
  const children = data.children || [];
  const childList = children.map((c) => {
    const cText = getNodeText(c);
    const cUid = getNodeUid(c);
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

/**
 * 搜索节点：按关键词匹配文本，返回 uid + 路径 + 文本
 */
function searchNodes(data, keyword, path) {
  if (!data) return [];
  const currentPath = path || [];
  const results = [];

  const text = getNodeText(data);
  const uid = getNodeUid(data);

  if (text && text.toLowerCase().includes(keyword.toLowerCase())) {
    results.push({
      uid,
      text,
      path: [...currentPath],
    });
  }

  const children = data.children || [];
  for (let i = 0; i < children.length; i++) {
    const childPath = [...currentPath, text || `#${i}`];
    results.push(...searchNodes(children[i], keyword, childPath));
  }

  return results;
}

module.exports = { formatTree, formatSummary, getTreeStats, searchNodes };
