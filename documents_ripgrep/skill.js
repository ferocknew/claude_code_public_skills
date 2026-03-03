#!/usr/bin/env node
// 文档搜索工具 v260303.121642

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/.pnpm/@vscode+ripgrep@1.17.0/node_modules/@vscode/ripgrep/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/@vscode+ripgrep@1.17.0/node_modules/@vscode/ripgrep/lib/index.js"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    module2.exports.rgPath = path2.join(__dirname, `../bin/rg${process.platform === "win32" ? ".exe" : ""}`);
  }
});

// run.js
var fs = require("fs");
var path = require("path");
var { execSync, spawn } = require("child_process");
var SKILL_VERSION = true ? "260303.121642" : "1.0.0-dev";
var OFFICE_EXTENSIONS = [".docx", ".xlsx", ".pptx"];
var TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".css",
  ".scss",
  ".html",
  ".xml",
  ".yaml",
  ".yml",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".csv",
  ".log",
  ".ini",
  ".conf",
  ".cfg",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".lua",
  ".sql",
  ".vue",
  ".svelte",
  ".astro"
];
var args = process.argv.slice(2);
var targetPath = null;
var searchKeyword = null;
var options = {
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  includeOffice: true,
  maxResults: 100
};
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
function showHelp() {
  console.log(`
\u6587\u6863\u5185\u5BB9\u641C\u7D22\u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <\u76EE\u5F55\u8DEF\u5F84> <\u641C\u7D22\u5173\u952E\u8BCD> [\u9009\u9879]

\u53C2\u6570:
  \u76EE\u5F55\u8DEF\u5F84        \u8981\u641C\u7D22\u7684\u76EE\u5F55\u6216\u6587\u4EF6\u8DEF\u5F84\uFF08\u5FC5\u9700\uFF09
  \u641C\u7D22\u5173\u952E\u8BCD      \u8981\u641C\u7D22\u7684\u5173\u952E\u8BCD\u6216\u6B63\u5219\u8868\u8FBE\u5F0F\uFF08\u5FC5\u9700\uFF09

\u9009\u9879:
  -h, --help           \u663E\u793A\u6B64\u5E2E\u52A9\u4FE1\u606F
  -v, --version        \u663E\u793A\u7248\u672C\u4FE1\u606F
  -i, --ignore-case    \u5FFD\u7565\u5927\u5C0F\u5199\uFF08\u9ED8\u8BA4\uFF09
  -s, --case-sensitive \u533A\u5206\u5927\u5C0F\u5199
  -w, --word           \u5168\u8BCD\u5339\u914D
  -e, --regex          \u4F7F\u7528\u6B63\u5219\u8868\u8FBE\u5F0F
  --no-office          \u8DF3\u8FC7 Office \u6587\u4EF6\u641C\u7D22
  -m, --max-results N  \u6700\u5927\u7ED3\u679C\u6570\u91CF\uFF08\u9ED8\u8BA4 100\uFF09

\u652F\u6301\u7684\u6587\u4EF6\u683C\u5F0F:
  \u6587\u672C\u6587\u4EF6: ${TEXT_EXTENSIONS.join(", ")}
  Office:   ${OFFICE_EXTENSIONS.join(", ")}

\u793A\u4F8B:
  # \u5728\u76EE\u5F55\u4E2D\u641C\u7D22\u5173\u952E\u8BCD
  node skill.js ~/Documents "\u91CD\u8981"

  # \u533A\u5206\u5927\u5C0F\u5199\u641C\u7D22
  node skill.js ~/Documents "API" -s

  # \u6B63\u5219\u8868\u8FBE\u5F0F\u641C\u7D22
  node skill.js ~/Documents "\\d{4}-\\d{2}-\\d{2}" -e

  # \u5168\u8BCD\u5339\u914D
  node skill.js ~/Documents "test" -w

  # \u9650\u5236\u7ED3\u679C\u6570\u91CF
  node skill.js ~/Documents "config" -m 50
`);
}
function showVersion() {
  console.log(`\u6587\u6863\u5185\u5BB9\u641C\u7D22\u5DE5\u5177 v${SKILL_VERSION}`);
  console.log("\u57FA\u4E8E ripgrep + textract");
}
if (!targetPath) {
  console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u8981\u641C\u7D22\u7684\u76EE\u5F55\u6216\u6587\u4EF6\u8DEF\u5F84");
  console.log("\u4F7F\u7528 -h \u67E5\u770B\u5E2E\u52A9");
  process.exit(1);
}
if (!searchKeyword) {
  console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u641C\u7D22\u5173\u952E\u8BCD");
  console.log("\u4F7F\u7528 -h \u67E5\u770B\u5E2E\u52A9");
  process.exit(1);
}
if (!fs.existsSync(targetPath)) {
  console.error(`\u9519\u8BEF: \u8DEF\u5F84\u4E0D\u5B58\u5728 - ${targetPath}`);
  process.exit(1);
}
console.log("\n" + "=".repeat(70));
console.log("\u{1F50D} \u6587\u6863\u5185\u5BB9\u641C\u7D22");
console.log("=".repeat(70));
console.log(`
\u76EE\u5F55: ${path.resolve(targetPath)}`);
console.log(`\u5173\u952E\u8BCD: "${searchKeyword}"`);
console.log(`\u9009\u9879: \u5927\u5C0F\u5199${options.caseSensitive ? "\u654F\u611F" : "\u4E0D\u654F\u611F"}${options.wholeWord ? ", \u5168\u8BCD\u5339\u914D" : ""}${options.regex ? ", \u6B63\u5219\u6A21\u5F0F" : ""}`);
console.log();
var results = [];
function searchWithRipgrep() {
  console.log("\u{1F4C4} \u641C\u7D22\u6587\u672C\u6587\u4EF6...");
  try {
    const rgArgs = [
      "--json",
      // JSON 输出格式
      "--max-count",
      String(options.maxResults)
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
    rgArgs.push("--type-add", "text:*{txt,md,json,js,ts,jsx,tsx,py,java,c,cpp,h,hpp,css,scss,html,xml,yaml,yml,sh,bash,zsh,csv,log,ini,conf,cfg,go,rs,rb,php,lua,sql,vue,svelte,astro}");
    rgArgs.push("-t", "text");
    rgArgs.push(searchKeyword);
    rgArgs.push(targetPath);
    let rgPath;
    try {
      rgPath = require_lib().rgPath;
    } catch {
      rgPath = "rg";
    }
    const output = execSync(`"${rgPath}" ${rgArgs.map((a) => `"${a}"`).join(" ")}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      cwd: targetPath
    }).toString();
    const lines = output.split("\n").filter(Boolean);
    let count = 0;
    for (const line of lines) {
      if (count >= options.maxResults) break;
      try {
        const data = JSON.parse(line);
        if (data.type === "match") {
          const match = data.data;
          results.push({
            file: match.path.text,
            line: match.line_number,
            column: match.submatches[0]?.start || 0,
            content: match.lines.text.trim(),
            type: "text"
          });
          count++;
        }
      } catch {
      }
    }
    console.log(`  \u2713 \u627E\u5230 ${count} \u4E2A\u6587\u672C\u6587\u4EF6\u5339\u914D`);
  } catch (err) {
    if (err.status === 1) {
      console.log("  \u2713 \u672A\u627E\u5230\u6587\u672C\u6587\u4EF6\u5339\u914D");
    } else {
      console.log(`  \u26A0 \u6587\u672C\u6587\u4EF6\u641C\u7D22\u51FA\u9519: ${err.message}`);
    }
  }
}
function extractTextFromOffice(filePath) {
  try {
    const output = execSync(`npx -y textract "${filePath}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 3e4
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
  console.log("\n\u{1F4E6} \u641C\u7D22 Office \u6587\u4EF6...");
  const officeFiles = [];
  function collectOfficeFiles(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat2 = fs.statSync(fullPath);
      if (stat2.isDirectory()) {
        if (!item.startsWith(".") && !["node_modules", "vendor", "dist", "build"].includes(item)) {
          collectOfficeFiles(fullPath);
        }
      } else if (stat2.isFile()) {
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
    console.log("  \u2713 \u672A\u627E\u5230 Office \u6587\u4EF6");
    return;
  }
  console.log(`  \u53D1\u73B0 ${officeFiles.length} \u4E2A Office \u6587\u4EF6`);
  let count = 0;
  const searchPattern = options.regex ? new RegExp(searchKeyword, options.caseSensitive ? "g" : "gi") : new RegExp(options.wholeWord ? `\\b${escapeRegExp(searchKeyword)}\\b` : escapeRegExp(searchKeyword), options.caseSensitive ? "g" : "gi");
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
          content: line.trim().substring(0, 200),
          type: "office"
        });
        count++;
      }
    }
  }
  console.log(`  \u2713 \u627E\u5230 ${count} \u4E2A Office \u6587\u4EF6\u5339\u914D`);
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
searchWithRipgrep();
searchInOfficeFiles();
console.log("\n" + "=".repeat(70));
console.log(`\u{1F4CA} \u641C\u7D22\u7ED3\u679C: ${results.length} \u4E2A\u5339\u914D`);
console.log("=".repeat(70) + "\n");
if (results.length === 0) {
  console.log("\u672A\u627E\u5230\u5339\u914D\u5185\u5BB9");
} else {
  const grouped = {};
  for (const result of results) {
    if (!grouped[result.file]) {
      grouped[result.file] = [];
    }
    grouped[result.file].push(result);
  }
  const displayResults = results.slice(0, options.maxResults);
  for (const result of displayResults) {
    const typeIcon = result.type === "office" ? "\u{1F4E6}" : "\u{1F4C4}";
    console.log(`${typeIcon} ${result.file}:${result.line}`);
    console.log(`   ${result.content}`);
    console.log();
  }
  if (results.length > options.maxResults) {
    console.log(`... \u8FD8\u6709 ${results.length - options.maxResults} \u4E2A\u7ED3\u679C\u672A\u663E\u793A`);
  }
  console.log("\n" + "\u2500".repeat(70));
  console.log(`\u603B\u8BA1: ${results.length} \u4E2A\u5339\u914D`);
  console.log(`\u6587\u4EF6\u6570: ${Object.keys(grouped).length}`);
}
console.log("\n" + "=".repeat(70));
console.log("\u2705 \u5B8C\u6210\uFF01");
console.log("=".repeat(70) + "\n");
