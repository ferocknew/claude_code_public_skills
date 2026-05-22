/**
 * XmlTextOps — 文本读取、搜索、替换
 */

const {
  extractAllXmlBlocks, extractParagraphText,
  encodeXmlEntities, decodeXmlEntities, escapeRegExp,
} = require("./xml_utils");

const XmlTextOps = {
  /** 读取文档全部文本（按段落） */
  readAllText(documentXml) {
    const paragraphs = extractAllXmlBlocks(documentXml, "w:p");
    return paragraphs.map((p, i) => ({
      text: extractParagraphText(p.xml),
      index: i,
    }));
  },

  /** 搜索文本 */
  findText(documentXml, query, useRegex = false) {
    const paragraphs = extractAllXmlBlocks(documentXml, "w:p");
    const results = [];
    const re = useRegex ? new RegExp(query, "gi") : new RegExp(escapeRegExp(query), "gi");

    for (let i = 0; i < paragraphs.length; i++) {
      const text = extractParagraphText(paragraphs[i].xml);
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        results.push({
          paragraph: i, match: m[0], position: m.index,
          context: text.substring(Math.max(0, m.index - 20), m.index + m[0].length + 20),
        });
      }
    }
    return results;
  },

  /**
   * 文本替换 — 在 <w:t> 元素内容上直接替换
   * 支持纯文本和正则两种模式，保留原有格式属性
   */
  replaceText(xml, findStr, replaceStr, dryRun = false, useRegex = false) {
    let totalReplacements = 0;
    let newXml = xml;

    newXml = newXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (fullMatch, attrs, content) => {
      const decoded = decodeXmlEntities(content);
      let count = 0;
      let newText;

      if (useRegex) {
        const re = new RegExp(findStr, "g");
        newText = decoded.replace(re, (m) => { count++; return replaceStr; });
      } else {
        let idx = 0;
        const parts = [];
        while (true) {
          const pos = decoded.indexOf(findStr, idx);
          if (pos === -1) { parts.push(decoded.substring(idx)); break; }
          parts.push(decoded.substring(idx, pos));
          parts.push(replaceStr);
          count++;
          idx = pos + findStr.length;
        }
        newText = parts.join("");
      }

      totalReplacements += count;
      if (dryRun || count === 0) return fullMatch;

      const safeAttrs = attrs.includes("xml:space") ? attrs : `${attrs} xml:space="preserve"`;
      return `<w:t${safeAttrs}>${encodeXmlEntities(newText)}</w:t>`;
    });

    return { xml: newXml, replacements: totalReplacements };
  },
};

module.exports = { XmlTextOps };
