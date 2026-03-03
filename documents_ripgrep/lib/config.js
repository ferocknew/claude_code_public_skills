/**
 * 配置文件 - 定义常量
 */

const path = require("path");
const os = require("os");

// 支持的 Office 文件扩展名
exports.OFFICE_EXTENSIONS = [".docx", ".xlsx", ".pptx"];

// Office 文件并发处理数量
exports.OFFICE_CONCURRENCYURRENCY = 5;

// 文本文件扩展名（ripgrep 直接搜索）
exports.TEXT_EXTENSIONS = [
  ".txt", ".md", ".json", ".js", ".ts", ".jsx", ".tsx",
  ".py", ".java", ".c", ".cpp", ".h", ".hpp",
  ".css", ".scss", ".html", ".xml", ".yaml", ".yml",
  ".sh", ".bash", ".zsh", ".fish",
  ".csv", ".log", ".ini", ".conf", ".cfg",
  ".go", ".rs", ".rb", ".php", ".lua", ".sql",
  ".vue", ".svelte", ".astro",
];

// 默认选项
exports.DEFAULT_OPTIONS = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  includeOffice: true,
  maxResults: 100,
};

// 缓存目录
exports.CACHE_DIR = path.join(os.homedir(), ".cache", "documents_ripgrep");

// 缓存过期时间（毫秒）- 30天
exports.CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
