/**
 * 缓存管理模块
 * 用于缓存 Office 文件提取的文本内容
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { CACHE_DIR, CACHE_EXPIRY_MS } = require("./config");

// 确保缓存目录存在
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * 生成缓存信息：文件绝对路径的 SHA1 和修改时间
 * @param {string} filePath - 文件路径
 * @returns {object} { sha1, mtimeMs }
 */
function generateCacheKey(filePath) {
  const stat = fs.statSync(filePath);
  const sha1 = crypto.createHash("sha1").update(filePath).digest("hex");
  return {
    sha1,
    mtimeMs: stat.mtimeMs,
  };
}

/**
 * 获取缓存文件路径：sha1.修改时间.txt
 * @param {object} cacheKey - { sha1, mtimeMs }
 * @returns {string} 缓存文件文件名
 */
function getCacheFileName(cacheKey) {
  return `${cacheKey.sha1}.${cacheKey.mtimeMs}.txt`;
}

/**
 * 获取缓存文件完整路径
 * @param {object} cacheKey - { sha1, mtimeMs }
 * @returns {string} 缓存文件路径
 */
function getCacheFilePath(cacheKey) {
  return path.join(CACHE_DIR, getCacheFileName(cacheKey));
}

/**
 * 从缓存读取文本
 * @param {string} filePath - 原文件路径
 * @returns {string|null} 缓存的文本，如果缓存不存在或已过期则返回 null
 */
function getFromCache(filePath) {
  ensureCacheDir();

  const cacheKey = generateCacheKey(filePath);
  const cacheFilePath = getCacheFilePath(cacheKey);

  if (!fs.existsSync(cacheFilePath)) {
    return null;
  }

  const stat = fs.statSync(cacheFilePath);
  const now = Date.now();

  // 检查缓存是否过期
  if (now - stat.mtimeMs > CACHE_EXPIRY_MS) {
    fs.unlinkSync(cacheFilePath);
    return null;
  }

  return fs.readFileSync(cacheFilePath, "utf-8");
}

/**
 * 将文本写入缓存
 * @param {string} filePath - 原文件路径
 * @param {string} text - 要缓存的文本
 */
function saveToCache(filePath, text) {
  ensureCacheDir();

  const cacheKey = generateCacheKey(filePath);
  const cacheFilePath = getCacheFilePath(cacheKey);

  fs.writeFileSync(cacheFilePath, text, "utf-8");
}

/**
 * 清理过期的缓存文件
 * @returns {number} 清理的文件数量
 */
function cleanExpiredCache() {
  ensureCacheDir();

  const now = Date.now();
  const files = fs.readdirSync(CACHE_DIR);
  let cleaned = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const stat = fs.statSync(filePath);

    if (now - stat.mtimeMs > CACHE_EXPIRY_MS) {
      fs.unlinkSync(filePath);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * 清空所有缓存
 */
function clearAllCache() {
  ensureCacheDir();

  const files = fs.readdirSync(CACHE_DIR);
  for (const file of files) {
    fs.unlinkSync(path.join(CACHE_DIR, file));
  }
}

/**
 * 获取缓存目录信息
 * @returns {object} 缓存目录信息
 */
function getCacheInfo() {
  ensureCacheDir();

  const files = fs.readdirSync(CACHE_DIR);
  let totalSize = 0;
  let expiredCount = 0;
  const now = Date.now();

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const stat = fs.statSync(filePath);
    totalSize += stat.size;

    if (now - stat.mtimeMs > CACHE_EXPIRY_MS) {
      expiredCount++;
    }
  }

  return {
    dir: CACHE_DIR,
    fileCount: files.length,
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    expiredCount,
  };
}

exports.getFromCache = getFromCache;
exports.saveToCache = saveToCache;
exports.cleanExpiredCache = cleanExpiredCache;
exports.clearAllCache = clearAllCache;
exports.getCacheInfo = getCacheInfo;
