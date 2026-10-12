/**
 * memo 相关命令
 *
 * 覆盖 MemoService 的主要接口：
 *   list / get / create / update / delete / archive / restore / pin / unpin
 *   comments / comment / reactions / react / unreact / tags
 */

const { apiRequest, normalizeMemoUid, getConfig } = require("../api");

const VISIBILITIES = ["PRIVATE", "PROTECTED", "PUBLIC"];

/**
 * 校验 visibility 取值
 * @param {string} value
 * @returns {string}
 */
function normalizeVisibility(value) {
  if (!value) return "PRIVATE";
  const upper = String(value).toUpperCase();
  if (!VISIBILITIES.includes(upper)) {
    throw new Error(`visibility 取值非法：${value}（可选 ${VISIBILITIES.join(" / ")}）`);
  }
  return upper;
}

/**
 * 把 memo 精简成适合展示的字段
 * @param {Object} memo 原始 Memo 对象
 * @returns {Object}
 */
function simplifyMemo(memo) {
  const uid = normalizeMemoUid(memo.name);
  return {
    uid,
    state: memo.state,
    visibility: memo.visibility,
    pinned: memo.pinned,
    creator: memo.creator,
    createTime: memo.createTime,
    updateTime: memo.updateTime,
    tags: memo.tags || [],
    content: memo.content,
    snippet: memo.snippet,
  };
}

/**
 * memo list —— 列出 memo
 * @param {string[]} args 位置参数（未使用）
 * @param {Object} options 命令行选项
 */
async function cmdMemoList(args, options) {
  const config = getConfig(options);
  const filter = buildFilter(options);

  const res = await apiRequest("GET", "/api/v1/memos", {
    config,
    query: {
      pageSize: options.limit || options.pagesize || 50,
      pageToken: options.pagetoken,
      filter,
      orderBy: options.orderby || "create_time desc",
      state: options.archived ? "ARCHIVED" : options.state ? String(options.state).toUpperCase() : undefined,
    },
  });

  const memos = (res.memos || []).map(simplifyMemo);
  return {
    count: memos.length,
    nextPageToken: res.nextPageToken || "",
    memos,
  };
}

/**
 * 由命令行选项拼装 CEL 过滤表达式
 * 显式 --filter 优先，其余快捷选项在其基础上用 && 组合
 * @param {Object} options
 * @returns {string|undefined}
 */
function buildFilter(options) {
  const terms = [];
  if (options.filter) terms.push(String(options.filter));
  if (options.tag) terms.push(`"${escapeCel(options.tag)}" in tags`);
  if (options.search) terms.push(`content.contains("${escapeCel(options.search)}")`);
  if (options.visibility) {
    terms.push(`visibility == "${normalizeVisibility(options.visibility)}"`);
  }
  if (options.pinned) terms.push("pinned == true");
  if (options.since) {
    // 支持 "168h" / "7d" / "2026-01-01T00:00:00Z"
    const dur = parseDuration(options.since);
    if (dur) terms.push(`created_ts > now - duration("${dur}")`);
    else terms.push(`created_ts > timestamp("${escapeCel(options.since)}")`);
  }
  return terms.length ? terms.join(" && ") : undefined;
}

/**
 * 转义 CEL 字符串字面量中的双引号与反斜杠
 * @param {string} value
 * @returns {string}
 */
function escapeCel(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * 把 "7d" / "24h" / "30m" 转成 CEL duration 字符串
 * @param {string} value
 * @returns {string|null}
 */
function parseDuration(value) {
  const m = String(value).trim().match(/^(\d+)([smhdw])$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const hours = { s: n / 3600, m: n / 60, h: n, d: n * 24, w: n * 168 }[unit];
  return `${hours}h`;
}

/**
 * memo get —— 查看单条 memo
 */
async function cmdMemoGet(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo get <uid>");

  const config = getConfig(options);
  const memo = await apiRequest("GET", `/api/v1/memos/${encodeURIComponent(uid)}`, { config });
  return simplifyMemo(memo);
}

/**
 * memo create —— 新建 memo
 */
async function cmdMemoCreate(args, options) {
  const content = options.content !== undefined ? String(options.content) : args.join(" ");
  if (!content) throw new Error("缺少内容，用法：memo create <内容> 或 memo create --content <内容>");

  const config = getConfig(options);
  const memo = await apiRequest("POST", "/api/v1/memos", {
    config,
    query: { memoId: options.memoid },
    body: {
      content,
      visibility: normalizeVisibility(options.visibility),
      ...(options.pinned ? { pinned: true } : {}),
    },
  });
  return simplifyMemo(memo);
}

/**
 * memo update —— 修改内容/可见性/置顶
 */
async function cmdMemoUpdate(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo update <uid> [--content <内容>] [--visibility <值>]");

  const fields = [];
  const body = {};

  if (options.content !== undefined) {
    body.content = String(options.content);
    fields.push("content");
  } else if (args.length > 1) {
    body.content = args.slice(1).join(" ");
    fields.push("content");
  }

  if (options.visibility !== undefined) {
    body.visibility = normalizeVisibility(options.visibility);
    fields.push("visibility");
  }

  if (options.pinned !== undefined) {
    body.pinned = options.pinned !== "false";
    fields.push("pinned");
  }

  if (fields.length === 0) {
    throw new Error("没有需要更新的字段：请提供 --content / --visibility / --pinned");
  }

  const config = getConfig(options);
  const memo = await apiRequest("PATCH", `/api/v1/memos/${encodeURIComponent(uid)}`, {
    config,
    query: { updateMask: fields.join(",") },
    body,
  });
  return simplifyMemo(memo);
}

/**
 * memo delete —— 删除 memo
 */
async function cmdMemoDelete(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo delete <uid>");

  const config = getConfig(options);
  await apiRequest("DELETE", `/api/v1/memos/${encodeURIComponent(uid)}`, {
    config,
    query: { force: options.force ? "true" : undefined },
  });
  return { deleted: true, uid };
}

/**
 * memo archive / restore —— 归档与恢复（改 state 字段）
 * @param {string[]} args
 * @param {Object} options
 * @param {string} state NORMAL | ARCHIVED
 */
async function setMemoState(args, options, state) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error(`缺少 memo uid，用法：memo ${state === "ARCHIVED" ? "archive" : "restore"} <uid>`);

  const config = getConfig(options);
  const memo = await apiRequest("PATCH", `/api/v1/memos/${encodeURIComponent(uid)}`, {
    config,
    query: { updateMask: "state" },
    body: { state },
  });
  return simplifyMemo(memo);
}

const cmdMemoArchive = (args, options) => setMemoState(args, options, "ARCHIVED");
const cmdMemoRestore = (args, options) => setMemoState(args, options, "NORMAL");

/**
 * memo pin / unpin —— 置顶开关
 * @param {string[]} args
 * @param {Object} options
 * @param {boolean} pinned
 */
async function setMemoPinned(args, options, pinned) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error(`缺少 memo uid，用法：memo ${pinned ? "pin" : "unpin"} <uid>`);

  const config = getConfig(options);
  const memo = await apiRequest("PATCH", `/api/v1/memos/${encodeURIComponent(uid)}`, {
    config,
    query: { updateMask: "pinned" },
    body: { pinned },
  });
  return simplifyMemo(memo);
}

const cmdMemoPin = (args, options) => setMemoPinned(args, options, true);
const cmdMemoUnpin = (args, options) => setMemoPinned(args, options, false);

/**
 * memo comments —— 列出评论
 */
async function cmdMemoComments(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo comments <uid>");

  const config = getConfig(options);
  const res = await apiRequest("GET", `/api/v1/memos/${encodeURIComponent(uid)}/comments`, {
    config,
    query: { pageSize: options.limit, orderBy: options.orderby },
  });

  const comments = (res.memos || []).map(simplifyMemo);
  return { count: comments.length, comments };
}

/**
 * memo comment —— 给 memo 添加评论
 */
async function cmdMemoComment(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo comment <uid> <内容>");

  const content = options.content !== undefined ? String(options.content) : args.slice(1).join(" ");
  if (!content) throw new Error("缺少评论内容，用法：memo comment <uid> <内容>");

  const config = getConfig(options);
  const memo = await apiRequest("POST", `/api/v1/memos/${encodeURIComponent(uid)}/comments`, {
    config,
    body: {
      content,
      visibility: normalizeVisibility(options.visibility),
    },
  });
  return simplifyMemo(memo);
}

/**
 * memo reactions —— 列出表情回应
 */
async function cmdMemoReactions(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo reactions <uid>");

  const config = getConfig(options);
  const res = await apiRequest("GET", `/api/v1/memos/${encodeURIComponent(uid)}/reactions`, {
    config,
  });

  const reactions = (res.reactions || []).map((r) => ({
    id: String(r.name || "").split("/").pop(),
    reactionType: r.reactionType,
    creator: r.creator,
    createTime: r.createTime,
  }));
  return { count: reactions.length, reactions };
}

/**
 * memo react —— 添加/更新表情回应
 */
async function cmdMemoReact(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo react <uid> <表情>");

  const reactionType = options.type || args[1];
  if (!reactionType) throw new Error("缺少表情，用法：memo react <uid> 👍");

  const config = getConfig(options);
  const res = await apiRequest("POST", `/api/v1/memos/${encodeURIComponent(uid)}/reactions`, {
    config,
    body: { reaction: { reactionType } },
  });
  return {
    id: String(res.name || "").split("/").pop(),
    reactionType: res.reactionType,
    creator: res.creator,
    createTime: res.createTime,
  };
}

/**
 * memo unreact —— 删除表情回应
 */
async function cmdMemoUnreact(args, options) {
  const uid = normalizeMemoUid(args[0]);
  if (!uid) throw new Error("缺少 memo uid，用法：memo unreact <uid> <回应id>");

  const reactionId = options.id || args[1];
  if (!reactionId) {
    throw new Error("缺少回应 id：先执行 `memo reactions <uid>` 查看 id，再 `memo unreact <uid> <id>`");
  }

  const config = getConfig(options);
  await apiRequest(
    "DELETE",
    `/api/v1/memos/${encodeURIComponent(uid)}/reactions/${encodeURIComponent(reactionId)}`,
    { config }
  );
  return { deleted: true, uid, reactionId };
}

/**
 * memo tags —— 从当前可见 memo 中统计标签
 */
async function cmdMemoTags(args, options) {
  const config = getConfig(options);
  const limit = parseInt(options.limit || "200", 10);

  const res = await apiRequest("GET", "/api/v1/memos", {
    config,
    query: { pageSize: Math.min(limit, 1000), state: options.archived ? "ARCHIVED" : undefined },
  });

  const counts = new Map();
  for (const memo of res.memos || []) {
    for (const tag of memo.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const tags = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return { scanned: (res.memos || []).length, count: tags.length, tags };
}

module.exports = {
  cmdMemoList,
  cmdMemoGet,
  cmdMemoCreate,
  cmdMemoUpdate,
  cmdMemoDelete,
  cmdMemoArchive,
  cmdMemoRestore,
  cmdMemoPin,
  cmdMemoUnpin,
  cmdMemoComments,
  cmdMemoComment,
  cmdMemoReactions,
  cmdMemoReact,
  cmdMemoUnreact,
  cmdMemoTags,
  simplifyMemo,
  normalizeVisibility,
};
