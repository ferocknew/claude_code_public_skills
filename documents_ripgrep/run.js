#!/usr/bin/env node
/**
 * 文档内容搜索工具
 *
 * 使用 ripgrep 搜索文本文件，使用 textract 提取 Office 文件内容
 *
 * 支持格式:
 *   - 文本文件: ripgrep 直接搜索
 *   - Office 文件: .docx, .xlsx, .pptx (需要 textract 全局安装)
 *
 * 用法:
 *   node skill.js <目录路径> <搜索关键词> [选项]
 *
 * 作者: Claude Code
 * 版本: 1.0.0
 */

const fs = require("fs");
const path = require("path");

// 导入模块
const { TEXT_EXTENSIONS, OFFICE_EXTENSIONS, DEFAULT_OPTIONS } = require("./lib/config");
const { searchWithRipgrep } = require("./lib/ripgrep");
const { searchInOfficeFiles, resetSearchState } = require("./lib/office");
const { outputResults } = require("./lib/output");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 解析命令行参数
const args = process.argv.slice(2);
let targetPath = null;
let searchKeyword = null;
let options = { ...DEFAULT_OPTIONS };

// 解析参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    showHelp();
    process.exit(0);
  } else if (arg === "-v" || arg === "--version") {
    showVersion();
    process.exit(0);
  } else if (arg === "-i" || arg === "--ignore-case") {
    options.caseSensitive = false;
  } else if (arg === "-s" || arg === "--case-sensitive") {
    options.caseSensitive = true;
  } else if (arg === "-w" || arg === "--word") {
    options.wholeWord = true;
  } else if (arg === "-e" || arg === "--regex") {
    options.regex = true;
  } else if (arg === "--no-office") {
    options.includeOffice = false;
  } else if (arg === "--max-results" || arg === "-m") {
    options.maxResults = parseInt(args[++i], 10) || 100;
  } else if (!arg.startsWith("-")) {
    if (!targetPath) {
      targetPath = arg;
    } else if (!searchKeyword) {
      searchKeyword = arg;
    }
  }
}

// 显示帮助
function showHelp() {
  console.log(`
文档内容搜索工具 v${SKILL_VERSION}

用法:
  node skill.js <目录路径> <搜索关键词> [选项]

参数:
  目录路径        要搜索的目录或文件路径（必需）
  搜索关键词      要搜索的关键词或正则表达式（必需）

选项:
  -h, --help           显示此帮助信息
  -v, --version        显示版本信息
  -i, --ignore-case    忽略大小写（默认）
  -s, --case-sensitive 区分大小写
  -w, --word           全词匹配
  -e, --regex          使用正则表达式
  --no-office          跳过 Office 文件搜索
  -m, --max-results N  最大结果数量（默认 100）

支持的文件格式:
  文本文件: ${TEXT_EXTENSIONS.join(", ")}
  Office:   ${OFFICE_EXTENSIONS.join(", ")}

示例:
  # 在目录中搜索关键词
  node skill.js ~/Documents "重要"

  # 区分大小写搜索
  node skill.js ~/Documents "API" -s

  # 正则表达式搜索
  node skill.js ~/Documents "\\d{4}-\\d{2}-\\d{2}" -e



  # 全词匹配
  node skill.js ~/Documents "test" -w

  # 限制结果数量
  node skill.js ~/Documents "config" -m 50
`);
}

// 显示版本
function showVersion() {
  console.log(`文档内容搜索工具 v${SKILL_VERSION}`);
  console.log("基于 ripgrep + textract");
}

// 检查参数
if (!targetPath) {
  console.error("错误: 请指定要搜索的目录或文件路径");
  console.log("使用 -h 查看帮助");
  process.exit(1);
}

if (!searchKeyword) {
  console.error("错误: 请指定搜索关键词");
  console.log("使用 -h 查看帮助");
  process.exit(1);
}

// 检查路径是否存在
if (!fs.existsSync(targetPath)) {
  console.error(`错误: 路径不存在 - ${targetPath}`);
  process.exit(1);
}

console.log("\n" + "=".repeat(70));
console.log("🔍 文档内容搜索");
console.log("=".repeat(70));
console.log(`\n目录: ${path.resolve(targetPath)}`);
console.log(`关键词: "${searchKeyword}"`);
console.log(`选项: 大小写${options.caseSensitive ? "敏感" : "不敏感"}${options.wholeWord ? ", 全词匹配" : ""}${options.regex ? ", 正则模式" : ""}`);
console.log();

// 结果收集
const results = [];

// ============================================
// 执行搜索
// ============================================

(async () => {
  resetSearchState();
  searchWithRipgrep(targetPath, searchKeyword, options, results);
  await searchInOfficeFiles(targetPath, searchKeyword, options, results);
  await outputResults(results);
})();
