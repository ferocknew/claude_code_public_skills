/**
 * Office 文件搜索模块
 * 支持并行处理和流式输出
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { OFFICE_EXTENSIONS, OFFICE_CONCURRENCYURRENCY } = require("./config");
const { escapeRegExp } = require("./utils");
const { getFromCache, saveToCache } = require("./cache");

// 提前退出标志（全局）
let shouldStopSearching = false;

/**
 * 重置搜索状态
 */
function resetSearchState() {
  shouldStopSearching = false;
}

/**
 * 使用 textract 提取 Office 文件文本内容（异步，使用 spawn）
 * @param {string} filePath - 文件路径
 * @returns {Promise<string|null>} 提取的文本或 null
 */
async function extractTextFromOffice(filePath) {
  // 先尝试从缓存读取
  const cachedText = getFromCache(filePath);
  if (cachedText !== null) {
    {
      return cachedText;
    }
  }

  // 缓存未命中，使用 textract 提取
  return new Promise((resolve) => {
    const textract = spawn("npx", ["-y", "textract", filePath], {
      encoding: "utf-8",
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
      // 保存到缓存
      saveToCache(filePath, text);
      resolve(text);
    });

    textract.on("error", () => {
      resolve(null);
    });
  });
}

/**
 * 收集目录中的 Office 文件
 * @param {string} dir - 目录路径
 * @param {Array} officeFiles - 文件数组（引用传递）
 */
function collectOfficeFiles(dir, officeFiles) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (shouldStopSearching) break;

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 跳过隐藏目录和常见排除目录
      if (!item.startsWith(".") && !["node_modules", "vendor", "dist", "build"].includes(item)) {
        collectOfficeFiles(fullPath, officeFiles);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (OFFICE_EXTENSIONS.includes(ext)) {
        officeFiles.push(fullPath);
      }
    }
  }
}

/**
 * 搜索 Office 文件（异步，支持并行处理）
 * @param {string} targetPath - 搜索目录或文件路径
 * @param {string} searchKeyword - 搜索关键词
 * @param {object} options - 搜索选项
 * @param {Array} results - 结果数组
 * @returns {Promise<number>} 找到的匹配数量
 */
async function searchInOfficeFiles(targetPath, searchKeyword, options, results) {
  if (!options.includeOffice) {
    return 0;
  }

  console.log("\n📦 搜索 Office 文件...");

  // 收集 Office 文件
  const officeFiles = [];

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    collectOfficeFiles(targetPath, officeFiles);
  } else if (stat.isFile()) {
    const ext = path.extname(targetPath).toLowerCase();
    if (OFFICE_EXTENSIONS.includes(ext)) {
      officeFiles.push(targetPath);
    }
  }

  if (officeFiles.length === 0) {
    console.log("  ✓ 未找到 Office 文件");
    return 0;
  }

  console.log(`  发现 ${officeFiles.length} 个 Office 文件`);

  // 构建搜索模式
  const searchPattern = options.regex
    ? new RegExp(searchKeyword, options.caseSensitive ? "g" : "gi")
    : new RegExp(options.wholeWord ? `\\b${escapeRegExp(searchKeyword)}\\b` : escapeRegExp(searchKeyword), options.caseSensitive ? "g" : "gi");

  // 并发处理多个文件
  let count = 0;
  let processed = 0;

  /**
   * 处理一个文件分块
   * @param {Array} chunk - 文件路径数组
   */
  async function processFileChunk(chunk) {
    const promises = chunk.map(async (filePath) => {
      if (shouldStopSearching) return [];

      const text = await extractTextFromOffice(filePath);
      if (!text) return [];

      // 在提取的文本中搜索
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
            type: "office",
          });
        }
      }

      return fileMatches;
    });

    const chunkResults = await Promise.allSettled(promises);

    // 处理结果
    for (const result of chunkResults) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        for (const match of result.value) {
          if (count >= options.maxResults) {
            shouldStopSearching = true;
            break;
          }

          results.push(match);
          count++;
        }
      }
      processed++;

      // 显示进度（每处理 5 个文件更新一次）
      if (processed % 5 === 0 || processed === officeFiles.length) {
        process.stdout.write(`\r  进度: ${processed}/${officeFiles.length} 文件, 已找到 ${count} 个匹配`);
      }
    }
  }

  // 将文件分成多个分块，每块 OFFICE_CONCURRENCY 个
  const chunks = [];
  for (let i = 0; i < officeFiles.length; i += OFFICE_CONCURRENCYURRENCY) {
    chunks.push(officeFiles.slice(i, i + OFFICE_CONCURRENCYURRENCY));
  }

  // 逐块处理
  for (const chunk of chunks) {
    if (shouldStopSearching) break;
    await processFileChunk(chunk);
  }

  // 清除进度行
  process.stdout.write("\r" + " ".repeat(50) + "\r");
  console.log(`  ✓ 找到 ${count} 个 Office 文件匹配`);

  return count;
}

exports.searchInOfficeFiles = searchInOfficeFiles;
exports.resetSearchState = resetSearchState;
