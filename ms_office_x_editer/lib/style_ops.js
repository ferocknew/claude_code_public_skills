/**
 * StyleOps — 样式读取、修改（支持跨 run）
 */

const {
  extractXmlBlock, extractAllXmlBlocks, extractParagraphText,
  extractTextFromRun, extractRunProps,
  encodeXmlEntities, decodeXmlEntities, escapeRegExp,
} = require("./xml_utils");

// ─── 样式解析 ───────────────────────────────────────────────────

function parseRunStyle(rprXml) {
  if (!rprXml) return {};
  const style = {};

  if (/<w:b[\/>]/.test(rprXml)) style.bold = true;
  if (/<w:bCs[\/>]/.test(rprXml)) style.boldCs = true;
  if (/<w:i[\/>]/.test(rprXml)) style.italic = true;
  if (/<w:iCs[\/>]/.test(rprXml)) style.italicCs = true;

  const uMatch = rprXml.match(/<w:u\s+w:val="([^"]*)"/);
  if (uMatch) style.underline = uMatch[1];

  if (/<w:strike[\/>]/.test(rprXml)) style.strikethrough = true;

  const szMatch = rprXml.match(/<w:sz\s+w:val="(\d+)"/);
  if (szMatch) style.fontSize = parseInt(szMatch[1], 10);

  const fontsMatch = rprXml.match(/<w:rFonts\s+([^>]*)/);
  if (fontsMatch) {
    const attrs = fontsMatch[1];
    const ascii = attrs.match(/w:ascii="([^"]*)"/);
    const hAnsi = attrs.match(/w:hAnsi="([^"]*)"/);
    const ea = attrs.match(/w:eastAsia="([^"]*)"/);
    if (ascii || hAnsi || ea) {
      style.fontFamily = {
        ascii: ascii ? ascii[1] : undefined,
        hAnsi: hAnsi ? hAnsi[1] : undefined,
        eastAsia: ea ? ea[1] : undefined,
      };
    }
  }

  const colorMatch = rprXml.match(/<w:color\s+w:val="([^"]*)"/);
  if (colorMatch) style.color = colorMatch[1];

  const hlMatch = rprXml.match(/<w:highlight\s+w:val="([^"]*)"/);
  if (hlMatch) style.highlight = hlMatch[1];

  return style;
}

// ─── 样式应用 ───────────────────────────────────────────────────

function applyStyleToRpr(rprXml, styleChanges) {
  let rpr = rprXml || "<w:rPr></w:rPr>";

  if (styleChanges.bold === true) {
    if (!/<w:b[\/>]/.test(rpr)) rpr = rpr.replace("</w:rPr>", "<w:b/></w:rPr>");
  } else if (styleChanges.bold === false) {
    rpr = rpr.replace(/<w:b\/?>/g, "").replace(/<w:bCs\/?>/g, "");
  }

  if (styleChanges.italic === true) {
    if (!/<w:i[\/>]/.test(rpr)) rpr = rpr.replace("</w:rPr>", "<w:i/></w:rPr>");
  } else if (styleChanges.italic === false) {
    rpr = rpr.replace(/<w:i\/?>/g, "").replace(/<w:iCs\/?>/g, "");
  }

  if (styleChanges.underline !== undefined) {
    rpr = rpr.replace(/<w:u[^>]*\/?>/g, "");
    if (styleChanges.underline) {
      rpr = rpr.replace("</w:rPr>", `<w:u w:val="${styleChanges.underline}"/></w:rPr>`);
    }
  }

  if (styleChanges.strikethrough === true) {
    if (!/<w:strike[\/>]/.test(rpr)) rpr = rpr.replace("</w:rPr>", "<w:strike/></w:rPr>");
  } else if (styleChanges.strikethrough === false) {
    rpr = rpr.replace(/<w:strike\/?>/g, "");
  }

  if (styleChanges.fontSize !== undefined) {
    rpr = rpr.replace(/<w:sz\s+w:val="\d+"[^>]*\/?>/g, "");
    rpr = rpr.replace(/<w:szCs\s+w:val="\d+"[^>]*\/?>/g, "");
    rpr = rpr.replace("</w:rPr>", `<w:sz w:val="${styleChanges.fontSize}"/></w:rPr>`);
  }

  if (styleChanges.fontFamily !== undefined) {
    rpr = rpr.replace(/<w:rFonts[^>]*\/?>/g, "");
    const ff = styleChanges.fontFamily;
    const attrs = [];
    if (ff.ascii || ff) attrs.push(`w:ascii="${ff.ascii || ff}"`);
    if (ff.hAnsi || ff) attrs.push(`w:hAnsi="${ff.hAnsi || ff}"`);
    if (ff.eastAsia) attrs.push(`w:eastAsia="${ff.eastAsia}"`);
    rpr = rpr.replace("</w:rPr>", `<w:rFonts ${attrs.join(" ")}/></w:rPr>`);
  }

  if (styleChanges.color !== undefined) {
    rpr = rpr.replace(/<w:color[^>]*\/?>/g, "");
    rpr = rpr.replace("</w:rPr>", `<w:color w:val="${styleChanges.color}"/></w:rPr>`);
  }

  if (styleChanges.highlight !== undefined) {
    rpr = rpr.replace(/<w:highlight[^>]*\/?>/g, "");
    if (styleChanges.highlight) {
      rpr = rpr.replace("</w:rPr>", `<w:highlight w:val="${styleChanges.highlight}"/></w:rPr>`);
    }
  }

  return rpr;
}

// ─── 对单个 run 应用样式 ────────────────────────────────────────

function applyStyleToRun(runXml, styleChanges) {
  const rpr = extractRunProps(runXml);
  const newRpr = applyStyleToRpr(rpr, styleChanges);
  return rpr
    ? runXml.replace(rpr, newRpr)
    : runXml.replace("<w:r>", `<w:r>${newRpr}`);
}

// ─── StyleOps ──────────────────────────────────────────────────

const StyleOps = {
  /** 读取包含指定文本的 run 的样式 */
  readStyle(documentXml, query) {
    const results = [];
    const allWt = documentXml.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [];
    for (const wt of allWt) {
      const content = decodeXmlEntities(wt.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, ""));
      if (!content.includes(query)) continue;

      const wtPos = documentXml.indexOf(wt);
      const runStart = documentXml.lastIndexOf("<w:r", wtPos);
      if (runStart === -1 || runStart < wtPos - 5000) continue;

      const runBlock = extractXmlBlock(documentXml.substring(runStart), "w:r");
      if (!runBlock) continue;

      results.push({
        text: content.substring(0, 100),
        style: parseRunStyle(extractRunProps(runBlock.xml)),
      });
    }
    return results;
  },

  /**
   * 对包含指定文本的 run 应用样式修改（支持跨 run 匹配）
   * 1. 先尝试单 run 内匹配（快速路径）
   * 2. 回退到段落级跨 run 匹配
   */
  applyStyle(documentXml, findStr, styleChanges, dryRun = false) {
    let xml = documentXml;
    let count = 0;

    // 快速路径：单 run 匹配
    let singleRunCount = 0;
    const runs = extractAllXmlBlocks(xml, "w:r");
    for (let i = runs.length - 1; i >= 0; i--) {
      if (!extractTextFromRun(runs[i].xml).includes(findStr)) continue;
      singleRunCount++;
      count++;
      if (dryRun) continue;
      const newRunXml = applyStyleToRun(runs[i].xml, styleChanges);
      xml = xml.substring(0, runs[i].start) + newRunXml + xml.substring(runs[i].end);
    }
    if (singleRunCount > 0) return { xml, count };

    // 段落级跨 run 匹配
    const paragraphs = extractAllXmlBlocks(xml, "w:p");
    for (let pi = paragraphs.length - 1; pi >= 0; pi--) {
      const pBlock = paragraphs[pi];
      const fullText = extractParagraphText(pBlock.xml);
      if (!fullText.includes(findStr)) continue;

      const pRuns = extractAllXmlBlocks(pBlock.xml, "w:r");
      if (pRuns.length === 0) continue;

      // 计算 run 文本范围
      let runRanges = [];
      let offset = 0;
      for (const r of pRuns) {
        const t = extractTextFromRun(r.xml);
        runRanges.push({ start: offset, end: offset + t.length });
        offset += t.length;
      }

      // 找受影响的 run
      const matched = new Set();
      let idx = 0;
      while (true) {
        const pos = fullText.indexOf(findStr, idx);
        if (pos === -1) break;
        for (let ri = 0; ri < runRanges.length; ri++) {
          if (runRanges[ri].start < pos + findStr.length && runRanges[ri].end > pos) {
            matched.add(ri);
          }
        }
        idx = pos + 1;
      }

      if (matched.size === 0) continue;
      count += matched.size;
      if (dryRun) continue;

      let newParaXml = pBlock.xml;
      const pRunsRaw = extractAllXmlBlocks(newParaXml, "w:r");
      for (const ri of [...matched].sort((a, b) => b - a)) {
        if (ri >= pRunsRaw.length) continue;
        const newRunXml = applyStyleToRun(pRunsRaw[ri].xml, styleChanges);
        newParaXml = newParaXml.substring(0, pRunsRaw[ri].start) + newRunXml + newParaXml.substring(pRunsRaw[ri].end);
      }
      xml = xml.substring(0, pBlock.start) + newParaXml + xml.substring(pBlock.end);
    }

    return { xml, count };
  },
};

module.exports = { StyleOps };
