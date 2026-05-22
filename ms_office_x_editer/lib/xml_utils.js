/**
 * XML 工具函数 — 括号平衡提取、文本操作
 */

/**
 * 检查 openTag 前缀匹配后，下一个字符是否是标签名边界
 * 防止 `<w:p` 匹配到 `<w:pPr>` 等不同标签
 */
function isTagNameBoundary(xml, pos, tagName) {
  const nextIdx = pos + 1 + tagName.length; // 跳过 '<' + tagName
  if (nextIdx >= xml.length) return true;
  const ch = xml[nextIdx];
  return ch === ">" || ch === " " || ch === "/" || ch === "\n" || ch === "\t" || ch === "\r";
}

/**
 * 查找下一个有效的开放标签位置（跳过同名前缀的其他标签）
 */
function findOpenTag(xml, tagName, startPos) {
  const prefix = `<${tagName}`;
  let pos = startPos;
  while (pos < xml.length) {
    pos = xml.indexOf(prefix, pos);
    if (pos === -1) return -1;
    if (isTagNameBoundary(xml, pos, tagName)) return pos;
    pos++;
  }
  return -1;
}

/**
 * 括号平衡提取 XML 块
 * 从 xml 的 startPos 位置开始，找到 tagName 对应的完整 XML 块
 */
function extractXmlBlock(xml, tagName, startPos = 0) {
  const closeTag = `</${tagName}>`;
  let pos = findOpenTag(xml, tagName, startPos);
  if (pos === -1) return null;

  let tagEnd = xml.indexOf(">", pos);
  if (tagEnd === -1) return null;

  // 检查是否自闭合
  if (xml[tagEnd - 1] === "/") {
    return { xml: xml.substring(pos, tagEnd + 1), start: pos, end: tagEnd + 1 };
  }

  let depth = 1;
  let searchPos = tagEnd + 1;

  while (depth > 0 && searchPos < xml.length) {
    const nextOpen = findOpenTag(xml, tagName, searchPos);
    const nextClose = xml.indexOf(closeTag, searchPos);

    if (nextClose === -1) return null;

    // 没有更多开放标签，或关闭标签在开放标签之前
    if (nextOpen === -1 || nextClose < nextOpen) {
      depth--;
      if (depth === 0) {
        const blockEnd = nextClose + closeTag.length;
        return { xml: xml.substring(pos, blockEnd), start: pos, end: blockEnd };
      }
      searchPos = nextClose + closeTag.length;
    } else {
      // 有开放标签在关闭标签之前，检查是否自闭合
      const gtPos = xml.indexOf(">", nextOpen);
      if (gtPos !== -1 && xml[gtPos - 1] === "/") {
        // 自闭合标签，深度不变
        searchPos = gtPos + 1;
      } else {
        depth++;
        searchPos = gtPos + 1;
      }
    }
  }
  return null;
}

/**
 * 提取所有同名 XML 块
 */
function extractAllXmlBlocks(xml, tagName) {
  const blocks = [];
  let pos = 0;
  while (true) {
    const block = extractXmlBlock(xml, tagName, pos);
    if (!block) break;
    blocks.push(block);
    pos = block.end;
  }
  return blocks;
}

/**
 * 从 <w:t> 元素中提取文本
 */
function extractTextFromWt(textElement) {
  const m = textElement.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/);
  return m ? decodeXmlEntities(m[1]) : "";
}

/**
 * 从一个 <w:r> 中提取文本
 */
function extractTextFromRun(runXml) {
  const texts = [];
  const re = /<w:t[^>]*>[\s\S]*?<\/w:t>/g;
  let m;
  while ((m = re.exec(runXml)) !== null) {
    texts.push(extractTextFromWt(m[0]));
  }
  return texts.join("");
}

/**
 * 从一个 <w:p> 中提取完整段落文本（跨多个 run）
 */
function extractParagraphText(paragraphXml) {
  const runs = extractAllXmlBlocks(paragraphXml, "w:r");
  return runs.map((b) => extractTextFromRun(b.xml)).join("");
}

/**
 * 提取 <w:rPr>...</w:rPr> 格式属性
 */
function extractRunProps(runXml) {
  const m = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return m ? m[0] : "";
}

/**
 * XML 实体编码/解码
 */
const XML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

function encodeXmlEntities(str) {
  return str.replace(/[&<>"']/g, (c) => XML_ENTITIES[c]);
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 清空 run 中的文本内容
 */
function clearRunText(runXml) {
  return runXml.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, '<w:t xml:space="preserve"></w:t>');
}

module.exports = {
  extractXmlBlock,
  extractAllXmlBlocks,
  extractTextFromRun,
  extractParagraphText,
  extractRunProps,
  encodeXmlEntities,
  decodeXmlEntities,
  escapeRegExp,
  clearRunText,
};
