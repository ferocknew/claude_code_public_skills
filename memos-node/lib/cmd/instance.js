/**
 * instance 相关命令
 *
 * 覆盖 InstanceService：
 *   profile  实例信息（版本、管理员、访问模式）
 *   stats    实例统计（数据库大小、存储占用）
 */

const { apiRequest, getConfig } = require("../api");

/**
 * instance profile —— 实例基本信息（无需认证也可读）
 */
async function cmdInstanceProfile(args, options) {
  const config = getConfig(options);
  const profile = await apiRequest("GET", "/api/v1/instance/profile", { config });

  const admin = profile.admin || {};
  return {
    version: profile.version,
    instanceUrl: profile.instanceUrl,
    commit: profile.commit,
    demo: profile.demo,
    needsSetup: profile.needsSetup,
    accessMode: profile.accessMode,
    admin: admin.username || admin.name || "",
  };
}

/**
 * instance stats —— 实例存储统计
 */
async function cmdInstanceStats(args, options) {
  const config = getConfig(options);
  const stats = await apiRequest("GET", "/api/v1/instance/stats", { config });

  return {
    database: stats.database || {},
    localStorageBytes: stats.localStorageBytes,
    generatedTime: stats.generatedTime,
  };
}

module.exports = {
  cmdInstanceProfile,
  cmdInstanceStats,
};
