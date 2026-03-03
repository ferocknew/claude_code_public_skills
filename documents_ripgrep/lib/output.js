/**
 * 结果输出模块
 */

const path = require("path");

/**
 * 生成上下文摘要（关键词前后各20个字符）
 * @param {string} rawContent - 原始内容
 * @param {number} matchStart - 匹配开始位置
 * @param {number} matchEnd - 匹配结束位置
 * @param {number} contextLength - 上下文长度
 * @returns {string} 上下文摘要
 */
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

/**
 * 输出搜索结果
 * @param {Array} results - 搜索结果数组
 */
async function outputResults(results) {
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
}

exports.getContextSnippet = getContextSnippet;
exports.outputResults = outputResults;
