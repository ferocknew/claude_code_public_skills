#!/usr/bin/env node
// 文档搜索工具 v260303.150207

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/config.js
var require_config = __commonJS({
  "lib/config.js"(exports2) {
    var path2 = require("path");
    var os = require("os");
    exports2.OFFICE_EXTENSIONS = [".docx", ".xlsx", ".pptx"];
    exports2.OFFICE_CONCURRENCYURRENCY = 5;
    exports2.TEXT_EXTENSIONS = [
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
    exports2.DEFAULT_OPTIONS = {
      caseSensitive: false,
      wholeWord: false,
      regex: false,
      includeOffice: true,
      maxResults: 100
    };
    exports2.CACHE_DIR = path2.join(os.homedir(), ".cache", "documents_ripgrep");
    exports2.CACHE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1e3;
  }
});

// node_modules/.pnpm/@vscode+ripgrep@1.17.0/node_modules/@vscode/ripgrep/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/@vscode+ripgrep@1.17.0/node_modules/@vscode/ripgrep/lib/index.js"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    module2.exports.rgPath = path2.join(__dirname, `../bin/rg${process.platform === "win32" ? ".exe" : ""}`);
  }
});

// lib/ripgrep.js
var require_ripgrep = __commonJS({
  "lib/ripgrep.js"(exports2) {
    var { execSync } = require("child_process");
    var { TEXT_EXTENSIONS: TEXT_EXTENSIONS2 } = require_config();
    function searchWithRipgrep2(targetPath2, searchKeyword2, options2, results2) {
      console.log("\u{1F4C4} \u641C\u7D22\u6587\u672C\u6587\u4EF6...");
      try {
        const rgArgs = [
          "--json",
          // JSON 输出格式
          "--max-count",
          String(options2.maxResults)
        ];
        if (!options2.caseSensitive) {
          rgArgs.push("--ignore-case");
        }
        if (options2.wholeWord) {
          rgArgs.push("--word-regexp");
        }
        if (!options2.regex) {
          rgArgs.push("--fixed-strings");
        }
        rgArgs.push("--type-add", "text:*{txt,md,json,js,ts,jsx,tsx,py,java,c,cpp,h,hpp,css,scss,html,xml,yaml,yml,sh,bash,zsh,csv,log,ini,conf,cfg,go,rs,rb,php,lua,sql,vue,svelte,astro}");
        rgArgs.push("-t", "text");
        rgArgs.push("--glob", "!node_modules/**");
        rgArgs.push("--glob", "!**/skill.js");
        rgArgs.push("--glob", "!**/skill-analyze.js");
        rgArgs.push("--glob", "!**/*.min.js");
        rgArgs.push(searchKeyword2);
        rgArgs.push(targetPath2);
        let rgPath;
        try {
          const rgModule = require_lib();
          rgPath = rgModule.rgPath;
          const fs2 = require("fs");
          if (!fs2.existsSync(rgPath)) {
            rgPath = null;
          }
        } catch {
          rgPath = null;
        }
        if (!rgPath) {
          rgPath = "rg";
        }
        const output = execSync(`"${rgPath}" ${rgArgs.map((a) => `"${a}"`).join(" ")}`, {
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024
        }).toString();
        const lines = output.split("\n").filter(Boolean);
        let count = 0;
        for (const line of lines) {
          if (count >= options2.maxResults) break;
          try {
            const data = JSON.parse(line);
            if (data.type === "match") {
              const match = data.data;
              const submatch = match.submatches[0];
              results2.push({
                file: match.path.text,
                line: match.line_number,
                column: submatch?.start || 0,
                content: match.lines.text,
                // 保留原始内容，不 trim
                matchStart: submatch?.start || 0,
                matchEnd: submatch?.end || 0,
                type: "text"
              });
              count++;
            }
          } catch {
          }
        }
        console.log(`  \u2713 \u627E\u5230 ${count} \u4E2A\u6587\u672C\u6587\u4EF6\u5339\u914D`);
        return count;
      } catch (err) {
        if (err.status === 1) {
          console.log("  \u2713 \u672A\u627E\u5230\u6587\u672C\u6587\u4EF6\u5339\u914D");
        } else {
          console.log(`  \u26A0 \u6587\u672C\u6587\u4EF6\u641C\u7D22\u51FA\u9519: ${err.message}`);
        }
        return 0;
      }
    }
    exports2.searchWithRipgrep = searchWithRipgrep2;
  }
});

// lib/utils.js
var require_utils = __commonJS({
  "lib/utils.js"(exports2) {
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    exports2.escapeRegExp = escapeRegExp;
  }
});

// lib/cache.js
var require_cache = __commonJS({
  "lib/cache.js"(exports2) {
    var fs2 = require("fs");
    var path2 = require("path");
    var crypto = require("crypto");
    var { CACHE_DIR, CACHE_EXPIRY_MS } = require_config();
    function ensureCacheDir() {
      if (!fs2.existsSync(CACHE_DIR)) {
        fs2.mkdirSync(CACHE_DIR, { recursive: true });
      }
    }
    function generateCacheKey(filePath) {
      const stat = fs2.statSync(filePath);
      const sha1 = crypto.createHash("sha1").update(filePath).digest("hex");
      return {
        sha1,
        mtimeMs: stat.mtimeMs
      };
    }
    function getCacheFileName(cacheKey) {
      return `${cacheKey.sha1}.${cacheKey.mtimeMs}.txt`;
    }
    function getCacheFilePath(cacheKey) {
      return path2.join(CACHE_DIR, getCacheFileName(cacheKey));
    }
    function getFromCache(filePath) {
      ensureCacheDir();
      const cacheKey = generateCacheKey(filePath);
      const cacheFilePath = getCacheFilePath(cacheKey);
      if (!fs2.existsSync(cacheFilePath)) {
        return null;
      }
      const stat = fs2.statSync(cacheFilePath);
      const now = Date.now();
      if (now - stat.mtimeMs > CACHE_EXPIRY_MS) {
        fs2.unlinkSync(cacheFilePath);
        return null;
      }
      return fs2.readFileSync(cacheFilePath, "utf-8");
    }
    function saveToCache(filePath, text) {
      ensureCacheDir();
      const cacheKey = generateCacheKey(filePath);
      const cacheFilePath = getCacheFilePath(cacheKey);
      fs2.writeFileSync(cacheFilePath, text, "utf-8");
    }
    function cleanExpiredCache() {
      ensureCacheDir();
      const now = Date.now();
      const files = fs2.readdirSync(CACHE_DIR);
      let cleaned = 0;
      for (const file of files) {
        const filePath = path2.join(CACHE_DIR, file);
        const stat = fs2.statSync(filePath);
        if (now - stat.mtimeMs > CACHE_EXPIRY_MS) {
          fs2.unlinkSync(filePath);
          cleaned++;
        }
      }
      return cleaned;
    }
    function clearAllCache() {
      ensureCacheDir();
      const files = fs2.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs2.unlinkSync(path2.join(CACHE_DIR, file));
      }
    }
    function getCacheInfo() {
      ensureCacheDir();
      const files = fs2.readdirSync(CACHE_DIR);
      let totalSize = 0;
      let expiredCount = 0;
      const now = Date.now();
      for (const file of files) {
        const filePath = path2.join(CACHE_DIR, file);
        const stat = fs2.statSync(filePath);
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
        expiredCount
      };
    }
    exports2.getFromCache = getFromCache;
    exports2.saveToCache = saveToCache;
    exports2.cleanExpiredCache = cleanExpiredCache;
    exports2.clearAllCache = clearAllCache;
    exports2.getCacheInfo = getCacheInfo;
  }
});

// lib/office.js
var require_office = __commonJS({
  "lib/office.js"(exports2) {
    var fs2 = require("fs");
    var path2 = require("path");
    var { spawn } = require("child_process");
    var { OFFICE_EXTENSIONS: OFFICE_EXTENSIONS2, OFFICE_CONCURRENCYURRENCY } = require_config();
    var { escapeRegExp } = require_utils();
    var { getFromCache, saveToCache } = require_cache();
    var shouldStopSearching = false;
    function resetSearchState2() {
      shouldStopSearching = false;
    }
    async function extractTextFromOffice(filePath) {
      const cachedText = getFromCache(filePath);
      if (cachedText !== null) {
        {
          return cachedText;
        }
      }
      return new Promise((resolve) => {
        const textract = spawn("npx", ["-y", "textract", filePath], {
          encoding: "utf-8"
        });
        let output = "";
        let error = "";
        textract.stdout.on("data", (data) => {
          output += data.toString();
        });
        textract.stderr.on("data", (data) => {
          error += data.toString();
        });
        textract.on("close", (code) => {
          if (code !== 0 || error) {
            resolve(null);
            return;
          }
          const text = output.toString();
          saveToCache(filePath, text);
          resolve(text);
        });
        textract.on("error", () => {
          resolve(null);
        });
      });
    }
    function collectOfficeFiles(dir, officeFiles) {
      const items = fs2.readdirSync(dir);
      for (const item of items) {
        if (shouldStopSearching) break;
        const fullPath = path2.join(dir, item);
        const stat = fs2.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!item.startsWith(".") && !["node_modules", "vendor", "dist", "build"].includes(item)) {
            collectOfficeFiles(fullPath, officeFiles);
          }
        } else if (stat.isFile()) {
          const ext = path2.extname(item).toLowerCase();
          if (OFFICE_EXTENSIONS2.includes(ext)) {
            officeFiles.push(fullPath);
          }
        }
      }
    }
    async function searchInOfficeFiles2(targetPath2, searchKeyword2, options2, results2) {
      if (!options2.includeOffice) {
        return 0;
      }
      console.log("\n\u{1F4E6} \u641C\u7D22 Office \u6587\u4EF6...");
      const officeFiles = [];
      const stat = fs2.statSync(targetPath2);
      if (stat.isDirectory()) {
        collectOfficeFiles(targetPath2, officeFiles);
      } else if (stat.isFile()) {
        const ext = path2.extname(targetPath2).toLowerCase();
        if (OFFICE_EXTENSIONS2.includes(ext)) {
          officeFiles.push(targetPath2);
        }
      }
      if (officeFiles.length === 0) {
        console.log("  \u2713 \u672A\u627E\u5230 Office \u6587\u4EF6");
        return 0;
      }
      console.log(`  \u53D1\u73B0 ${officeFiles.length} \u4E2A Office \u6587\u4EF6`);
      const searchPattern = options2.regex ? new RegExp(searchKeyword2, options2.caseSensitive ? "g" : "gi") : new RegExp(options2.wholeWord ? `\\b${escapeRegExp(searchKeyword2)}\\b` : escapeRegExp(searchKeyword2), options2.caseSensitive ? "g" : "gi");
      let count = 0;
      let processed = 0;
      async function processFileChunk(chunk) {
        const promises = chunk.map(async (filePath) => {
          if (shouldStopSearching) return [];
          const text = await extractTextFromOffice(filePath);
          if (!text) return [];
          const lines = text.split("\n");
          let fileMatches = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const matches = line.matchAll(searchPattern);
            for (const match of matches) {
              fileMatches.push({
                file: filePath,
                line: i + 1,
                column: match.index,
                content: line.trim(),
                matchStart: match.index,
                matchEnd: match.index + match[0].length,
                type: "office"
              });
            }
          }
          return fileMatches;
        });
        const chunkResults = await Promise.allSettled(promises);
        for (const result of chunkResults) {
          if (result.status === "fulfilled" && result.value.length > 0) {
            for (const match of result.value) {
              if (count >= options2.maxResults) {
                shouldStopSearching = true;
                break;
              }
              results2.push(match);
              count++;
            }
          }
          processed++;
          if (processed % 5 === 0 || processed === officeFiles.length) {
            process.stdout.write(`\r  \u8FDB\u5EA6: ${processed}/${officeFiles.length} \u6587\u4EF6, \u5DF2\u627E\u5230 ${count} \u4E2A\u5339\u914D`);
          }
        }
      }
      const chunks = [];
      for (let i = 0; i < officeFiles.length; i += OFFICE_CONCURRENCYURRENCY) {
        chunks.push(officeFiles.slice(i, i + OFFICE_CONCURRENCYURRENCY));
      }
      for (const chunk of chunks) {
        if (shouldStopSearching) break;
        await processFileChunk(chunk);
      }
      process.stdout.write("\r" + " ".repeat(50) + "\r");
      console.log(`  \u2713 \u627E\u5230 ${count} \u4E2A Office \u6587\u4EF6\u5339\u914D`);
      return count;
    }
    exports2.searchInOfficeFiles = searchInOfficeFiles2;
    exports2.resetSearchState = resetSearchState2;
  }
});

// lib/output.js
var require_output = __commonJS({
  "lib/output.js"(exports2) {
    var path2 = require("path");
    function getContextSnippet(rawContent, matchStart, matchEnd, contextLength = 20) {
      const buffer = Buffer.from(rawContent, "utf-8");
      function byteToCharOffset(byteOffset) {
        let charOffset = 0;
        let byteCount = 0;
        while (byteCount < byteOffset && charOffset < rawContent.length) {
          const charCode = rawContent.charCodeAt(charOffset);
          if (charCode <= 127) byteCount += 1;
          else if (charCode <= 2047) byteCount += 2;
          else if (charCode <= 65535) byteCount += 3;
          else byteCount += 4;
          charOffset++;
        }
        return charOffset;
      }
      const charStart = byteToCharOffset(matchStart);
      const charEnd = byteToCharOffset(matchEnd);
      const trimmed = rawContent.trim();
      const leadingSpaces = rawContent.length - rawContent.trimStart().length;
      const adjustedStart = Math.max(0, charStart - leadingSpaces);
      const adjustedEnd = Math.min(trimmed.length, charEnd - leadingSpaces);
      const contextStart = Math.max(0, adjustedStart - contextLength);
      const contextEnd = Math.min(trimmed.length, adjustedEnd + contextLength);
      const keyword = trimmed.substring(adjustedStart, adjustedEnd);
      const before = trimmed.substring(contextStart, adjustedStart);
      const after = trimmed.substring(adjustedEnd, contextEnd);
      let snippet = "";
      if (contextStart > 0) snippet += "...";
      snippet += before + "**" + keyword + "**" + after;
      if (contextEnd < trimmed.length) snippet += "...";
      return snippet;
    }
    async function outputResults2(results2) {
      console.log("\n" + "=".repeat(70));
      console.log(`\u{1F4CA} \u641C\u7D22\u7ED3\u679C: ${results2.length} \u4E2A\u5339\u914D`);
      console.log("=".repeat(70) + "\n");
      if (results2.length === 0) {
        console.log("\u672A\u627E\u5230\u5339\u914D\u5185\u5BB9");
      } else {
        const grouped = {};
        for (const result of results2) {
          const absPath = path2.resolve(result.file);
          if (!grouped[absPath]) {
            grouped[absPath] = [];
          }
          grouped[absPath].push(result);
        }
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
        console.log("\n" + "\u2500".repeat(70));
        console.log(`\u603B\u8BA1: ${results2.length} \u4E2A\u5339\u914D\uFF0C${Object.keys(grouped).length} \u4E2A\u6587\u4EF6`);
      }
      console.log("\n" + "=".repeat(70));
      console.log("\u2705 \u5B8C\u6210\uFF01");
      console.log("=".repeat(70) + "\n");
    }
    exports2.getContextSnippet = getContextSnippet;
    exports2.outputResults = outputResults2;
  }
});

// run.js
var fs = require("fs");
var path = require("path");
var { TEXT_EXTENSIONS, OFFICE_EXTENSIONS, DEFAULT_OPTIONS } = require_config();
var { searchWithRipgrep } = require_ripgrep();
var { searchInOfficeFiles, resetSearchState } = require_office();
var { outputResults } = require_output();
var SKILL_VERSION = true ? "260303.150207" : "1.0.0-dev";
var args = process.argv.slice(2);
var targetPath = null;
var searchKeyword = null;
var options = { ...DEFAULT_OPTIONS };
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
(async () => {
  resetSearchState();
  searchWithRipgrep(targetPath, searchKeyword, options, results);
  await searchInOfficeFiles(targetPath, searchKeyword, options, results);
  await outputResults(results);
})();
