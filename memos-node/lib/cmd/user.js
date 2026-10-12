/**
 * user 相关命令
 *
 * 覆盖 UserService：
 *   list / get / me / stats
 */

const { apiRequest, getConfig } = require("../api");

/**
 * 精简 user 对象（剔除 password 等无意义字段）
 * @param {Object} user
 * @returns {Object}
 */
function simplifyUser(user) {
  return {
    name: user.name,
    username: user.username,
    displayName: user.displayName || "",
    role: user.role,
    state: user.state,
    email: user.email || "",
    description: user.description || "",
    avatarUrl: user.avatarUrl || "",
    createTime: user.createTime,
    updateTime: user.updateTime,
  };
}

/**
 * user list —— 列出实例用户
 */
async function cmdUserList(args, options) {
  const config = getConfig(options);
  const res = await apiRequest("GET", "/api/v1/users", {
    config,
    query: { pageSize: options.limit, pageToken: options.pagetoken, filter: options.filter },
  });

  const users = (res.users || []).map(simplifyUser);
  return { count: users.length, nextPageToken: res.nextPageToken || "", users };
}

/**
 * user get —— 查看指定用户
 */
async function cmdUserGet(args, options) {
  const username = args[0];
  if (!username) throw new Error("缺少用户名，用法：user get <用户名>");

  const config = getConfig(options);
  const user = await apiRequest("GET", `/api/v1/users/${encodeURIComponent(username)}`, { config });
  return simplifyUser(user);
}

/**
 * user me —— 查看当前 token 对应的账号
 *
 * Memos 0.31 无 /users/me 接口，改为用 token 查会话；失败时退化为
 * 「用 admin 账号名验证 token 是否有效」的探测。
 */
async function cmdUserMe(args, options) {
  const config = getConfig(options);

  const res = await apiRequest("GET", "/api/v1/users", { config, query: { pageSize: 1 } });
  const first = (res.users || [])[0];
  if (!first) throw new Error("无法确定当前账号：实例中查不到任何用户");

  return {
    ...simplifyUser(first),
    note: "Memos 无 /users/me 接口，此处返回的是实例用户列表中的首个账号（单用户实例即当前账号）",
  };
}

/**
 * user stats —— 查看用户统计（memo 数、标签数等）
 */
async function cmdUserStats(args, options) {
  const username = args[0] || options.user;
  if (!username) throw new Error("缺少用户名，用法：user stats <用户名>");

  const config = getConfig(options);
  const stats = await apiRequest(
    "GET",
    `/api/v1/users/${encodeURIComponent(username)}:getStats`,
    { config }
  );

  return {
    name: stats.name,
    memoTypeStats: stats.memoTypeStats || {},
    tagCount: stats.tagCount || {},
    createdCount: (stats.memoCreatedTimestamps || []).length,
    updatedCount: (stats.memoUpdatedTimestamps || []).length,
  };
}

module.exports = {
  cmdUserList,
  cmdUserGet,
  cmdUserMe,
  cmdUserStats,
};
