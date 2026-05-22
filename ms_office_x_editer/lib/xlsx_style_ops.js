/**
 * xlsx_style_ops — xlsx 样式读取/修改
 *
 * 操作 xl/styles.xml：字体、填充、边框、单元格样式
 */

const { getXmlAttr, setXmlAttr } = require("./xlsx_utils");
const { decodeXmlEntities, encodeXmlEntities } = require("./xml_utils");

// ─── 样式读取 ────────────────────────────────────────────────────

/**
 * 读取 styles.xml 概览
 */
function readStylesOverview(stylesXml) {
  if (!stylesXml) return { fonts: 0, fills: 0, borders: 0, cellXfs: 0 };

  const fontsCount = getXmlAttr(stylesXml.match(/<fonts\b[^>]*>/)?.[0] || "", "count") || "0";
  const fillsCount = getXmlAttr(stylesXml.match(/<fills\b[^>]*>/)?.[0] || "", "count") || "0";
  const bordersCount = getXmlAttr(stylesXml.match(/<borders\b[^>]*>/)?.[0] || "", "count") || "0";
  const cellXfsCount = getXmlAttr(stylesXml.match(/<cellXfs\b[^>]*>/)?.[0] || "", "count") || "0";

  return {
    fonts: parseInt(fontsCount, 10),
    fills: parseInt(fillsCount, 10),
    borders: parseInt(bordersCount, 10),
    cellXfs: parseInt(cellXfsCount, 10),
  };
}

/**
 * 读取指定索引的 cellXf 样式详情
 */
function readCellStyle(stylesXml, xfIndex) {
  const cellXfsMatch = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (!cellXfsMatch) return null;

  const xfsContent = cellXfsMatch[1];
  // 使用 extractElements 获取完整 xf 元素（可能包含 <alignment/> 子元素）
  const xfs = extractElements(xfsContent, "xf");
  // 也收集自关闭的 <xf ... />
  const selfCloseRe = /<xf\b[^>]*\/>/g;
  let m;
  while ((m = selfCloseRe.exec(xfsContent)) !== null) {
    if (!xfs.some(x => x === m[0])) {
      xfs.push(m[0]);
    }
  }

  if (xfIndex >= xfs.length) return null;

  const xf = xfs[xfIndex];
  const fontId = parseInt(getXmlAttr(xf, "fontId") || "0", 10);
  const fillId = parseInt(getXmlAttr(xf, "fillId") || "0", 10);
  const borderId = parseInt(getXmlAttr(xf, "borderId") || "0", 10);
  const numFmtId = parseInt(getXmlAttr(xf, "numFmtId") || "0", 10);

  // 读取字体详情
  const font = readFont(stylesXml, fontId);
  // 读取填充详情
  const fill = readFill(stylesXml, fillId);
  // 读取边框详情
  const border = readBorder(stylesXml, borderId);

  // 读取对齐信息（xf 内嵌的 <alignment>）
  let alignment = null;
  const alignMatch = xf.match(/<alignment\b[^>]*\/?>/);
  if (alignMatch) {
    alignment = {};
    const hMatch = alignMatch[0].match(/horizontal="([^"]*)"/);
    if (hMatch) alignment.horizontal = hMatch[1];
    const vMatch = alignMatch[0].match(/vertical="([^"]*)"/);
    if (vMatch) alignment.vertical = vMatch[1];
    const wrapMatch = alignMatch[0].match(/wrapText="([^"]*)"/);
    if (wrapMatch) alignment.wrapText = wrapMatch[1] === "1" || wrapMatch[1] === "true";
    const rotateMatch = alignMatch[0].match(/textRotation="([^"]*)"/);
    if (rotateMatch) alignment.textRotation = parseInt(rotateMatch[1], 10);
    const indentMatch = alignMatch[0].match(/indent="([^"]*)"/);
    if (indentMatch) alignment.indent = parseInt(indentMatch[1], 10);
  }

  return {
    xfIndex,
    fontId,
    fillId,
    borderId,
    numFmtId,
    font,
    fill,
    border,
    alignment,
    raw: xf,
  };
}

/**
 * 读取指定索引的字体
 */
function readFont(stylesXml, fontIndex) {
  const fontsMatch = stylesXml.match(/<fonts\b[^>]*>([\s\S]*?)<\/fonts>/);
  if (!fontsMatch) return null;

  const fonts = extractElements(fontsMatch[1], "font");
  if (fontIndex >= fonts.length) return null;

  const fontXml = fonts[fontIndex];
  const result = {};

  // 字号
  const szMatch = fontXml.match(/<sz\b[^>]*val="([^"]*)"/);
  if (szMatch) result.fontSize = parseInt(szMatch[1], 10);

  // 字体名
  const nameMatch = fontXml.match(/<name\b[^>]*val="([^"]*)"/);
  if (nameMatch) result.fontName = nameMatch[1];

  // 粗体
  result.bold = /<b\b/.test(fontXml) && !/<b\s+val="0"/.test(fontXml);

  // 斜体
  result.italic = /<i\b/.test(fontXml) && !/<i\s+val="0"/.test(fontXml);

  // 下划线
  const uMatch = fontXml.match(/<u\b[^>]*val="([^"]*)"/);
  if (uMatch) result.underline = uMatch[1];
  else if (/<u\b/.test(fontXml) && !/<u\s+val="0"/.test(fontXml)) result.underline = "single";

  // 删除线
  result.strike = /<strike\b/.test(fontXml) && !/<strike\s+val="0"/.test(fontXml);

  // 颜色
  const colorMatch = fontXml.match(/<color\b[^>]*rgb="([^"]*)"/);
  if (colorMatch) result.color = colorMatch[1];
  else {
    const themeMatch = fontXml.match(/<color\b[^>]*theme="([^"]*)"/);
    if (themeMatch) result.colorTheme = themeMatch[1];
  }

  return result;
}

/**
 * 读取指定索引的边框
 */
function readBorder(stylesXml, borderIndex) {
  const bordersMatch = stylesXml.match(/<borders\b[^>]*>([\s\S]*?)<\/borders>/);
  if (!bordersMatch) return null;

  const borders = extractElements(bordersMatch[1], "border");
  if (borderIndex >= borders.length) return null;

  const borderXml = borders[borderIndex];
  const result = {};

  const sides = ["left", "right", "top", "bottom", "diagonal"];
  for (const side of sides) {
    const sideRe = new RegExp(`<${side}\\b[^>]*>`);
    if (sideRe.test(borderXml)) {
      // 检查是否有 style 属性（空标签如 <left/> 表示无边框）
      const fullRe = new RegExp(`<${side}\\b([^>]*)>`);
      const m = borderXml.match(fullRe);
      if (m) {
        const attrs = m[1];
        const styleMatch = attrs.match(/style="([^"]*)"/);
        if (styleMatch && styleMatch[1]) {
          result[side] = { style: styleMatch[1] };
          const colorMatch = attrs.match(/color\b[^>]*rgb="([^"]*)"/);
          if (colorMatch) result[side].color = colorMatch[1];
        }
      }
    }
  }

  return result;
}

/**
 * 读取指定索引的填充
 */
function readFill(stylesXml, fillIndex) {
  const fillsMatch = stylesXml.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/);
  if (!fillsMatch) return null;

  const fills = extractElements(fillsMatch[1], "fill");
  if (fillIndex >= fills.length) return null;

  const fillXml = fills[fillIndex];
  const bgMatch = fillXml.match(/<bgColor\b[^>]*rgb="([^"]*)"/);
  const fgMatch = fillXml.match(/<fgColor\b[^>]*rgb="([^"]*)"/);
  const patternMatch = fillXml.match(/<patternFill\b[^>]*patternType="([^"]*)"/);

  return {
    patternType: patternMatch ? patternMatch[1] : null,
    bgColor: bgMatch ? bgMatch[1] : null,
    fgColor: fgMatch ? fgMatch[1] : null,
  };
}

/**
 * 提取同名元素列表（简单实现）
 */
function extractElements(xml, tagName) {
  const elements = [];
  const openRe = new RegExp(`<${tagName}\\b[^>]*>`, "g");
  let m;
  while ((m = openRe.exec(xml)) !== null) {
    const start = m.index;
    // 找对应的关闭标签
    const closeTag = `</${tagName}>`;
    let depth = 1;
    let pos = m.index + m[0].length;

    while (depth > 0 && pos < xml.length) {
      const nextOpen = xml.indexOf(`<${tagName}`, pos);
      const nextClose = xml.indexOf(closeTag, pos);

      if (nextClose === -1) break;

      if (nextOpen === -1 || nextClose < nextOpen) {
        depth--;
        if (depth === 0) {
          elements.push(xml.substring(start, nextClose + closeTag.length));
        }
        pos = nextClose + closeTag.length;
      } else {
        depth++;
        pos = nextOpen + 1;
      }
    }
  }
  return elements;
}

// ─── 样式应用 ────────────────────────────────────────────────────

/**
 * 为单元格应用样式（查找或创建匹配的 cellXf）
 * 返回 { stylesXml, xfIndex }
 */
function applyStyle(stylesXml, currentXfIndex, styleChanges) {
  if (!stylesXml) {
    stylesXml = buildDefaultStylesXml();
  }

  // 读取当前 xf 的子样式 ID
  const currentXf = getXfById(stylesXml, currentXfIndex || 0);
  let fontId = parseInt(getXmlAttr(currentXf, "fontId") || "0", 10);
  let fillId = parseInt(getXmlAttr(currentXf, "fillId") || "0", 10);
  let borderId = parseInt(getXmlAttr(currentXf, "borderId") || "0", 10);

  // 修改字体
  if (styleChanges.bold !== undefined || styleChanges.italic !== undefined ||
      styleChanges.fontSize !== undefined || styleChanges.fontFamily !== undefined ||
      styleChanges.color !== undefined || styleChanges.underline !== undefined) {
    const newFont = buildModifiedFont(stylesXml, fontId, styleChanges);
    const fontResult = addOrFindFont(stylesXml, newFont);
    fontId = fontResult.index;
    stylesXml = fontResult.xml;
    stylesXml = updateFontsCount(stylesXml, fontId + 1);
  }

  // 修改填充（背景色）
  if (styleChanges.backgroundColor !== undefined) {
    const newFill = `<fill><patternFill patternType="solid"><fgColor rgb="${styleChanges.backgroundColor}"/></patternFill></fill>`;
    const fillResult = addOrFindFill(stylesXml, newFill);
    fillId = fillResult.index;
    stylesXml = fillResult.xml;
    stylesXml = updateFillsCount(stylesXml, fillId + 1);
  }

  // 修改边框
  if (styleChanges.border !== undefined) {
    const borderXml = buildBorderXml(styleChanges.border);
    const borderResult = addOrFindBorder(stylesXml, borderXml);
    borderId = borderResult.index;
    stylesXml = borderResult.xml;
    stylesXml = updateBordersCount(stylesXml, borderId + 1);
  }

  // 构建对齐 XML
  let alignmentXml = "";
  let applyAlignment = "";
  if (styleChanges.alignment !== undefined) {
    const align = styleChanges.alignment;
    let alignAttrs = "";
    if (align.horizontal) alignAttrs += ` horizontal="${align.horizontal}"`;
    if (align.vertical) alignAttrs += ` vertical="${align.vertical}"`;
    if (align.wrapText) alignAttrs += ` wrapText="1"`;
    if (align.textRotation !== undefined) alignAttrs += ` textRotation="${align.textRotation}"`;
    if (align.indent !== undefined) alignAttrs += ` indent="${align.indent}"`;
    if (alignAttrs) {
      alignmentXml = `<alignment${alignAttrs}/>`;
      applyAlignment = ' applyAlignment="1"';
    }
  }

  // 构建 xf
  const newXf = `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1"${styleChanges.backgroundColor ? ' applyFill="1"' : ""}${styleChanges.border ? ' applyBorder="1"' : ""}${applyAlignment}>${alignmentXml}</xf>`;

  // 在 cellXfs 中查找或追加
  const xfResult = addOrFindXf(stylesXml, newXf);
  const xfIndex = xfResult.index;
  stylesXml = xfResult.xml;
  stylesXml = updateCellXfsCount(stylesXml, xfIndex + 1);

  return { stylesXml, xfIndex };
}

function getXfById(stylesXml, index) {
  const cellXfsMatch = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (!cellXfsMatch) return "";
  const xfs = extractElements(cellXfsMatch[1], "xf");
  const selfCloseRe = /<xf\b[^>]*\/>/g;
  let m;
  while ((m = selfCloseRe.exec(cellXfsMatch[1])) !== null) {
    if (!xfs.some(x => x === m[0])) xfs.push(m[0]);
  }
  return index < xfs.length ? xfs[index] : "";
}

function buildModifiedFont(stylesXml, fontId, changes) {
  const existingFont = readFont(stylesXml, fontId) || {};
  let fontXml = "<font>";

  if (changes.bold !== undefined ? changes.bold : existingFont.bold) fontXml += "<b/>";
  if (changes.italic !== undefined ? changes.italic : existingFont.italic) fontXml += "<i/>";
  const underline = changes.underline !== undefined ? changes.underline : existingFont.underline;
  if (underline && underline !== "none") {
    fontXml += underline === "single" ? "<u/>" : `<u val="${underline}"/>`;
  }
  if (changes.strikethrough !== undefined ? changes.strikethrough : existingFont.strike) fontXml += "<strike/>";

  const sz = changes.fontSize !== undefined ? changes.fontSize : existingFont.fontSize;
  if (sz !== undefined) fontXml += `<sz val="${sz}"/>`;

  const color = changes.color !== undefined ? changes.color : (existingFont.color || undefined);
  if (color) fontXml += `<color rgb="FF${color.replace(/^FF/, '')}"/>`;

  const name = changes.fontFamily !== undefined ? changes.fontFamily : existingFont.fontName;
  if (name) fontXml += `<name val="${encodeXmlEntities(name)}"/>`;

  fontXml += "</font>";
  return fontXml;
}

function addOrFindFont(stylesXml, fontXml) {
  const fontsMatch = stylesXml.match(/(<fonts\b[^>]*>)([\s\S]*?)(<\/fonts>)/);
  if (!fontsMatch) return { index: 0, xml: stylesXml };
  const existing = fontsMatch[2];
  const fonts = extractElements(existing, "font");
  const idx = fonts.findIndex(f => normalizeXml(f) === normalizeXml(fontXml));
  if (idx !== -1) return { index: idx, xml: stylesXml };

  // 追加新字体
  const newContent = existing + fontXml;
  const newXml = stylesXml.replace(
    /(<fonts\b[^>]*>)([\s\S]*?)(<\/fonts>)/,
    `$1${newContent}$3`
  );
  return { index: fonts.length, xml: newXml };
}

function addOrFindFill(stylesXml, fillXml) {
  const fillsMatch = stylesXml.match(/(<fills\b[^>]*>)([\s\S]*?)(<\/fills>)/);
  if (!fillsMatch) return { index: 0, xml: stylesXml };
  const existing = fillsMatch[2];
  const fills = extractElements(existing, "fill");
  const idx = fills.findIndex(f => normalizeXml(f) === normalizeXml(fillXml));
  if (idx !== -1) return { index: idx, xml: stylesXml };

  const newContent = existing + fillXml;
  const newXml = stylesXml.replace(
    /(<fills\b[^>]*>)([\s\S]*?)(<\/fills>)/,
    `$1${newContent}$3`
  );
  return { index: fills.length, xml: newXml };
}

/**
 * 构建边框 XML
 * border 可以是：
 * - 简写 {"style":"thin","color":"000000"} → 全四边相同
 * - 详细 {"top":{"style":"thin","color":"000000"},"bottom":{"style":"medium"}} → 各边独立
 */
function buildBorderXml(border) {
  let xml = "<border>";
  const sides = ["left", "right", "top", "bottom", "diagonal"];

  if (border.style || border.color) {
    // 简写模式：全部四边使用相同设置
    const style = border.style || "thin";
    const color = border.color || "000000";
    for (const side of sides) {
      xml += `<${side} style="${style}"><color auto="1" rgb="FF${color.replace(/^FF/, '')}"/></${side}>`;
    }
  } else {
    // 详细模式：各边独立设置
    for (const side of sides) {
      if (border[side]) {
        const s = border[side].style || "thin";
        const c = border[side].color || "000000";
        xml += `<${side} style="${s}"><color auto="1" rgb="FF${c.replace(/^FF/, '')}"/></${side}>`;
      } else {
        xml += `<${side}/>`;
      }
    }
  }

  xml += "</border>";
  return xml;
}

function addOrFindBorder(stylesXml, borderXml) {
  const bordersMatch = stylesXml.match(/(<borders\b[^>]*>)([\s\S]*?)(<\/borders>)/);
  if (!bordersMatch) return { index: 0, xml: stylesXml };
  const existing = bordersMatch[2];
  const borders = extractElements(existing, "border");
  const idx = borders.findIndex(b => normalizeXml(b) === normalizeXml(borderXml));
  if (idx !== -1) return { index: idx, xml: stylesXml };

  const newContent = existing + borderXml;
  const newXml = stylesXml.replace(
    /(<borders\b[^>]*>)([\s\S]*?)(<\/borders>)/,
    `$1${newContent}$3`
  );
  return { index: borders.length, xml: newXml };
}

function addOrFindXf(stylesXml, xfXml) {
  const cellXfsMatch = stylesXml.match(/(<cellXfs\b[^>]*>)([\s\S]*?)(<\/cellXfs>)/);
  if (!cellXfsMatch) return { index: 0, xml: stylesXml };
  const existing = cellXfsMatch[2];

  // 提取所有 xf 元素（可能包含 <alignment/> 子元素）
  const xfs = extractElements(existing, "xf");
  // 也匹配自关闭的 <xf ... />
  const selfCloseRe = /<xf\b[^>]*\/>/g;
  let m;
  while ((m = selfCloseRe.exec(existing)) !== null) {
    // 检查是否已被 extractElements 包含（有子元素的不会被此正则匹配）
    if (!xfs.some(x => x === m[0])) {
      xfs.push(m[0]);
    }
  }

  const normalized = normalizeXml(xfXml);
  const idx = xfs.findIndex(x => normalizeXml(x) === normalized);
  if (idx !== -1) return { index: idx, xml: stylesXml };

  const newContent = existing + xfXml;
  const newXml = stylesXml.replace(
    /(<cellXfs\b[^>]*>)([\s\S]*?)(<\/cellXfs>)/,
    `$1${newContent}$3`
  );
  return { index: xfs.length, xml: newXml };
}

function updateFontsCount(stylesXml, count) {
  return stylesXml.replace(/(<fonts\b[^>]*\bcount=")(\d+)(")/, `$1${count}$3`);
}

function updateFillsCount(stylesXml, count) {
  return stylesXml.replace(/(<fills\b[^>]*\bcount=")(\d+)(")/, `$1${count}$3`);
}

function updateBordersCount(stylesXml, count) {
  return stylesXml.replace(/(<borders\b[^>]*\bcount=")(\d+)(")/, `$1${count}$3`);
}

function updateCellXfsCount(stylesXml, count) {
  return stylesXml.replace(/(<cellXfs\b[^>]*\bcount=")(\d+)(")/, `$1${count}$3`);
}

function normalizeXml(xml) {
  return xml.replace(/\s+/g, " ").replace(/\s*\/>/g, "/>").trim();
}

function buildDefaultStylesXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
}

module.exports = {
  readStylesOverview,
  readCellStyle,
  readFont,
  readFill,
  readBorder,
  applyStyle,
  extractElements,
};
