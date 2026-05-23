/**
 * 工具函数
 */

/**
 * 从内容中提取关键词上下文摘要
 * @param {string} content - 页面内容（Markdown）
 * @param {string} keyword - 搜索关键词
 * @param {number|string} contextLength - 上下文长度（字符数）或 "行" 数（如 "1" 表示上下各1行）
 * @returns {string} 摘要文本
 */
function extractSnippet(content, keyword, contextLength = 100) {
  if (!content) return "";

  // 移除 Markdown 语法，保留纯文本
  const plainText = content
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // 移除图片
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接转为文字
    .replace(/```[\s\S]*?```/g, "") // 移除代码块
    .replace(/`([^`]+)`/g, "$1") // 移除行内代码
    .replace(/#{1,6}\s+/g, "") // 移除标题
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 移除加粗
    .replace(/\*([^*]+)\*/g, "$1") // 移除斜体
    .replace(/\s+/g, " ") // 压缩空白
    .trim();

  if (!plainText) return "";

  // 查找关键词位置
  const keywordLower = keyword.toLowerCase();
  const textLower = plainText.toLowerCase();
  const index = textLower.indexOf(keywordLower);

  if (index === -1) {
    // 没找到关键词，返回前N个字符
    return plainText.slice(0, contextLength) + "...";
  }

  // 按行提取（当 contextLength 比较小且看起来像行数时）
  const isLineMode = typeof contextLength === "number" && contextLength < 10;

  if (isLineMode) {
    const lines = plainText.split(/[。！？.!?\n]/).filter(l => l.trim());
    const keywordLineIndex = lines.findIndex(l => l.toLowerCase().includes(keywordLower));

    if (keywordLineIndex !== -1) {
      const startLine = Math.max(0, keywordLineIndex - contextLength);
      const endLine = Math.min(lines.length, keywordLineIndex + contextLength + 1);
      const snippetLines = lines.slice(startLine, endLine);

      let snippet = snippetLines.join("。");
      if (startLine > 0) snippet = "..." + snippet;
      if (endLine < lines.length) snippet = snippet + "...";
      return snippet;
    }
  }

  // 字符模式：提取上下文
  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(plainText.length, index + keyword.length + contextLength / 2);

  let snippet = plainText.slice(start, end);

  // 添加省略号
  if (start > 0) snippet = "..." + snippet;
  if (end < plainText.length) snippet = snippet + "...";

  return snippet;
}

module.exports = { extractSnippet };