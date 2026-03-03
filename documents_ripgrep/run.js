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
const { execSync, spawn } = require("child_process");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 支持的 Office 文件扩展名
const OFFICE_EXTENSIONS = [".docx", ".xlsx", ".pptx"];

// 文本文件扩展名（ripgrep 直接搜索）
const TEXT_EXTENSIONS = [
  ".txt", ".md", ".json", ".js", ".ts", ".jsx", ".tsx",
  ".py", ".java", ".c", ".cpp", ".h", ".hpp",
  ".css", ".scss", ".html", ".xml", ".yaml", ".yml",
  ".sh", ".bash", ".zsh", ".fish",
  ".csv", ".log", ".ini", ".conf", ".cfg",
  ".go", ".rs", ".rb", ".php", ".lua", ".sql",
  ".vue", ".svelte", ".astro",
];

// 解析命令行参数
const args = process.argv.slice(2);
let targetPath = null;
let searchKeyword = null;
let options = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  includeOffice: true,
  maxResults: 100,
};

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
// 第一部分：使用 ripgrep 搜索文本文件
// ============================================

function searchWithRipgrep() {
  console.log("📄 搜索文本文件...");

  try {
    // 构建 ripgrep 命令参数
    const rgArgs = [
      "--json",           // JSON 输出格式
      "--max-count", String(options.maxResults),
    ];

    if (!options.caseSensitive) {
      rgArgs.push("--ignore-case");
    }

    if (options.wholeWord) {
      rgArgs.push("--word-regexp");
    }

    if (!options.regex) {
      rgArgs.push("--fixed-strings");
    }

    // 添加文件类型过滤
    rgArgs.push("--type-add", "text:*{txt,md,json,js,ts,jsx,tsx,py,java,c,cpp,h,hpp,css,scss,html,xml,yaml,yml,sh,bash,zsh,csv,log,ini,conf,cfg,go,rs,rb,php,lua,sql,vue,svelte,astro}");
    rgArgs.push("-t", "text");
    
    // 排除 node_modules 和打包文件
    rgArgs.push("--glob", "!node_modules/**");
    rgArgs.push("--glob", "!**/skill.js");
    rgArgs.push("--glob", "!**/skill-analyze.js");
    rgArgs.push("--glob", "!**/*.min.js");

    rgArgs.push(searchKeyword);
    rgArgs.push(targetPath);

    // 查找 ripgrep 可执行文件
    let rgPath;
    try {
      // 优先使用 @vscode/ripgrep
      const rgModule = require("@vscode/ripgrep");
      rgPath = rgModule.rgPath;
      // 检查文件是否存在
      if (!fs.existsSync(rgPath)) {
        rgPath = null;
      }
    } catch {
      rgPath = null;
    }
    
    // 回退到系统 ripgrep
    if (!rgPath) {
      rgPath = "rg";
    }

    const output = execSync(`"${rgPath}" ${rgArgs.map(a => `"${a}"`).join(" ")}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    }).toString();

    // 解析 JSON 输出
    const lines = output.split("\n").filter(Boolean);
    let count = 0;

    for (const line of lines) {
      if (count >= options.maxResults) break;

      try {
        const data = JSON.parse(line);
        if (data.type === "match") {
          const match = data.data;
          const submatch = match.submatches[0];
          results.push({
            file: match.path.text,
            line: match.line_number,
            column: submatch?.start || 0,
            content: match.lines.text,  // 保留原始内容，不 trim
            matchStart: submatch?.start || 0,
            matchEnd: submatch?.end || 0,
            type: "text",
          });
          count++;
        }
      } catch {
        // 忽略解析错误
      }
    }

    console.log(`  ✓ 找到 ${count} 个文本文件匹配`);
  } catch (err) {
    if (err.status === 1) {
      // ripgrep 返回 1 表示没有匹配
      console.log("  ✓ 未找到文本文件匹配");
    } else {
      console.log(`  ⚠ 文本文件搜索出错: ${err.message}`);
    }
  }
}

// ============================================
// 第二部分：使用 textract 搜索 Office 文件
// ============================================

function extractTextFromOffice(filePath) {
  try {
    // 使用 textract 提取文本
    const output = execSync(`npx -y textract "${filePath}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
    return output.toString();
  } catch (err) {
    return null;
  }
}

function searchInOfficeFiles() {
  if (!options.includeOffice) {
    return;
  }

  console.log("\n📦 搜索 Office 文件...");

  // 收集 Office 文件
  const officeFiles = [];
  
  function collectOfficeFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过隐藏目录和常见排除目录
        if (!item.startsWith(".") && !["node_modules", "vendor", "dist", "build"].includes(item)) {
          collectOfficeFiles(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (OFFICE_EXTENSIONS.includes(ext)) {
          officeFiles.push(fullPath);
        }
      }
    }
  }

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    collectOfficeFiles(targetPath);
  } else if (stat.isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    if (OFFICE_EXTENSIONS.includes(ext)) {
      officeFiles.push(targetPath);
    }
  }

  if (officeFiles.length === 0) {
    console.log("  ✓ 未找到 Office 文件");
    return;
  }

  console.log(`  发现 ${officeFiles.length} 个 Office 文件`);

  let count = 0;
  const searchPattern = options.regex 
    ? new RegExp(searchKeyword, options.caseSensitive ? "g" : "gi")
    : new RegExp(options.wholeWord ? `\\b${escapeRegExp(searchKeyword)}\\b` : escapeRegExp(searchKeyword), options.caseSensitive ? "g" : "gi");

  for (const filePath of officeFiles) {
    if (count >= options.maxResults) break;

    const text = extractTextFromOffice(filePath);
    if (!text) continue;

    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (count >= options.maxResults) break;

      const line = lines[i];
      const matches = line.matchAll(searchPattern);
      
      for (const match of matches) {
        if (count >= options.maxResults) break;

        results.push({
          file: filePath,
          line: i + 1,
          column: match.index,
          content: line.trim(),
          matchStart: match.index,
          matchEnd: match.index + match[0].length,
          type: "office",
        });
        count++;
      }
    }
  }

  console.log(`  ✓ 找到 ${count} 个 Office 文件匹配`);
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================
// 执行搜索
// ============================================

searchWithRipgrep();
searchInOfficeFiles();

// ============================================
// 输出结果
// ============================================

// 生成上下文摘要（关键词前后各20个字符）
function getContextSnippet(rawContent, matchStart, matchEnd, contextLength = 20) {
  // ripgrep 返回的是字节偏移，需要转换为字符偏移
  const buffer = Buffer.from(rawContent, 'utf-8');
  
  // 将字节偏移转换为字符偏移
  function byteToCharOffset(byteOffset) {
    let charOffset = 0;
    let byteCount = 0;
    while (byteCount < byteOffset && charOffset < rawContent.length) {
      const charCode = rawContent.charCodeAt(charOffset);
      // UTF-8 编码长度
      if (charCode <= 0x7F) byteCount += 1;
      else if (charCode <= 0x7FF) byteCount += 2;
      else if (charCode <= 0xFFFF) byteCount += 3;
      else byteCount += 4;
      charOffset++;
    }
    return charOffset;
  }
  
  const charStart = byteToCharOffset(matchStart);
  const charEnd = byteToCharOffset(matchEnd);
  
  // 先计算 trim 后的位置偏移
  const trimmed = rawContent.trim();
  const leadingSpaces = rawContent.length - rawContent.trimStart().length;
  
  // 调整匹配位置（相对于 trim 后的内容）
  const adjustedStart = Math.max(0, charStart - leadingSpaces);
  const adjustedEnd = Math.min(trimmed.length, charEnd - leadingSpaces);
  
  // 计算上下文范围
  const contextStart = Math.max(0, adjustedStart - contextLength);
  const contextEnd = Math.min(trimmed.length, adjustedEnd + contextLength);
  
  // 提取各部分
  const keyword = trimmed.substring(adjustedStart, adjustedEnd);
  const before = trimmed.substring(contextStart, adjustedStart);
  const after = trimmed.substring(adjustedEnd, contextEnd);
  
  let snippet = "";
  if (contextStart > 0) snippet += "...";
  snippet += before + "**" + keyword + "**" + after;
  if (contextEnd < trimmed.length) snippet += "...";
  
  return snippet;
}

console.log("\n" + "=".repeat(70));
console.log(`📊 搜索结果: ${results.length} 个匹配`);
console.log("=".repeat(70) + "\n");

if (results.length === 0) {
  console.log("未找到匹配内容");
} else {
  // 按文件分组
  const grouped = {};
  for (const result of results) {
    const absPath = path.resolve(result.file);
    if (!grouped[absPath]) {
      grouped[absPath] = [];
    }
    grouped[absPath].push(result);
  }

  // Markdown 格式输出
  console.log("```markdown");
  for (const [filePath, matches] of Object.entries(grouped)) {
    console.log(`- ${filePath}`);
    for (const match of matches) {
      const snippet = getContextSnippet(
        match.content,
        match.matchStart,
        match.matchEnd
      );
      console.log(`  - ${snippet}`);
    }
  }
  console.log("```");

  // 统计
  console.log("\n" + "─".repeat(70));
  console.log(`总计: ${results.length} 个匹配，${Object.keys(grouped).length} 个文件`);
}

console.log("\n" + "=".repeat(70));
console.log("✅ 完成！");
console.log("=".repeat(70) + "\n");
