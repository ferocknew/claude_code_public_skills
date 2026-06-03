/**
 * DiffOps — DOCX 文档差异算法
 *
 * 核心算法:
 *   A) 段落级 LCS 对齐
 *   B) 相似度配对（检测 modified）
 *   C) 词级 diff（中英文混合分词）
 */

const crypto = require("crypto");
const { extractAllXmlBlocks, extractParagraphText } = require("./xml_utils");
const { XmlTableOps, ImageOps, HeaderFooterOps, MetaOps } = require("./ops");

// ─── LCS 段落对齐 ─────────────────────────────────────────────

/**
 * 标准 DP LCS，返回 ops 列表
 * @param {string[]} oldLines - 旧段落文本数组
 * @param {string[]} newLines - 新段落文本数组
 * @returns {Array<{type:'equal'|'delete'|'insert', oldIdx?:number, newIdx?:number}>}
 */
function lcsAlign(oldLines, newLines) {
  const m = oldLines.length;
  const n = newLines.length;

  // DP 表：dp[i][j] = LCS 长度
  const dp = new Array(m + 1);
  for (let i = 0; i <= m; i++) dp[i] = new Uint16Array(n + 1);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯生成 ops
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: "equal", oldIdx: i - 1, newIdx: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "insert", newIdx: j - 1 });
      j--;
    } else {
      ops.push({ type: "delete", oldIdx: i - 1 });
      i--;
    }
  }
  ops.reverse();
  return ops;
}

// ─── 字符级相似度 ─────────────────────────────────────────────

/**
 * 计算两个字符串的字符级相似度（简化版 Jaccard + 长度惩罚）
 */
function charSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;

  // 用双字符集合做 Jaccard 系数
  const setA = new Set();
  const setB = new Set();
  for (let i = 0; i < a.length - 1; i++) setA.add(a.substring(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) setB.add(b.substring(i, i + 2));

  let inter = 0;
  for (const g of setA) { if (setB.has(g)) inter++; }
  const union = setA.size + setB.size - inter;
  if (union === 0) return 0;

  const jaccard = inter / union;
  // 长度差异惩罚
  const lenRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return jaccard * lenRatio;
}

/**
 * 对 LCS 未配对的 delete + insert 做相似度配对
 * 阈值 > 0.3 视为「修改」，贪婪匹配
 */
function pairModified(ops, oldTexts, newTexts) {
  const deletes = [];
  const inserts = [];
  const paired = new Set();

  for (const op of ops) {
    if (op.type === "delete") deletes.push(op);
    if (op.type === "insert") inserts.push(op);
  }

  const pairs = []; // [{deleteOp, insertOp, similarity}]
  for (const d of deletes) {
    let bestIdx = -1;
    let bestSim = 0.3; // 阈值
    for (let k = 0; k < inserts.length; k++) {
      if (paired.has(k)) continue;
      const sim = charSimilarity(oldTexts[d.oldIdx], newTexts[inserts[k].newIdx]);
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = k;
      }
    }
    if (bestIdx >= 0) {
      pairs.push({ deleteOp: d, insertOp: inserts[bestIdx], similarity: bestSim });
      paired.add(bestIdx);
      d.type = "modified";
      d.newIdx = inserts[bestIdx].newIdx;
    }
  }

  // 从 ops 中移除已配对的 insert
  const pairedInserts = new Set(pairs.map((p) => p.insertOp));
  for (let i = ops.length - 1; i >= 0; i--) {
    if (pairedInserts.has(ops[i])) ops.splice(i, 1);
  }

  return ops;
}

// ─── 词级 diff ─────────────────────────────────────────────────

/**
 * 中英文混合分词
 * CJK 字符逐字，英文保留完整单词，数字连续，空白分隔
 */
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    // CJK 统一汉字
    if ((ch >= 0x4E00 && ch <= 0x9FFF) || (ch >= 0x3400 && ch <= 0x4DBF) ||
        (ch >= 0x3000 && ch <= 0x303F) || (ch >= 0xFF00 && ch <= 0xFFEF)) {
      tokens.push(text[i]);
      i++;
    }
    // 英文/数字
    else if ((ch >= 0x41 && ch <= 0x5A) || (ch >= 0x61 && ch <= 0x7A) ||
             (ch >= 0x30 && ch <= 0x39) || ch === 0x5F) {
      let word = "";
      while (i < text.length) {
        const c2 = text.charCodeAt(i);
        if ((c2 >= 0x41 && c2 <= 0x5A) || (c2 >= 0x61 && c2 <= 0x7A) ||
            (c2 >= 0x30 && c2 <= 0x39) || c2 === 0x5F) {
          word += text[i]; i++;
        } else break;
      }
      tokens.push(word);
    }
    // 空白
    else if (ch === 0x20 || ch === 0x09 || ch === 0x0A || ch === 0x0D) {
      let ws = "";
      while (i < text.length) {
        const c2 = text.charCodeAt(i);
        if (c2 === 0x20 || c2 === 0x09 || c2 === 0x0A || c2 === 0x0D) {
          ws += text[i]; i++;
        } else break;
      }
      tokens.push(ws);
    }
    // 其他标点等
    else {
      tokens.push(text[i]);
      i++;
    }
  }
  return tokens;
}

/**
 * 对词数组做 LCS，返回 [{type, value}] 片段
 */
function wordDiff(oldText, newText) {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const ops = lcsAlignWords(oldTokens, newTokens);

  // 合并连续相同类型
  const segments = [];
  for (const op of ops) {
    const last = segments[segments.length - 1];
    if (last && last.type === op.type) {
      last.value += op.value;
    } else {
      segments.push({ type: op.type, value: op.value });
    }
  }
  return segments;
}

/**
 * 词级 LCS 对齐
 */
function lcsAlignWords(oldTokens, newTokens) {
  const m = oldTokens.length;
  const n = newTokens.length;

  const dp = new Array(m + 1);
  for (let i = 0; i <= m; i++) dp[i] = new Uint16Array(n + 1);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      ops.push({ type: "equal", value: oldTokens[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "inserted", value: newTokens[j - 1] });
      j--;
    } else {
      ops.push({ type: "deleted", value: oldTokens[i - 1] });
      i--;
    }
  }
  ops.reverse();
  return ops;
}

// ─── Diff 函数 ─────────────────────────────────────────────────

/**
 * 段落差异
 */
function diffParagraphs(oldDocXml, newDocXml) {
  const oldParas = extractAllXmlBlocks(oldDocXml, "w:p").map((p) => extractParagraphText(p.xml));
  const newParas = extractAllXmlBlocks(newDocXml, "w:p").map((p) => extractParagraphText(p.xml));

  let ops = lcsAlign(oldParas, newParas);
  ops = pairModified(ops, oldParas, newParas);

  // 统计
  const stats = { added: 0, deleted: 0, modified: 0, unchanged: 0 };

  const changes = ops.map((op) => {
    let detail = null;
    switch (op.type) {
      case "equal":
        stats.unchanged++;
        return { type: "equal", oldIdx: op.oldIdx, newIdx: op.newIdx, text: oldParas[op.oldIdx] };
      case "delete":
        stats.deleted++;
        return { type: "deleted", oldIdx: op.oldIdx, text: oldParas[op.oldIdx] };
      case "insert":
        stats.added++;
        return { type: "added", newIdx: op.newIdx, text: newParas[op.newIdx] };
      case "modified":
        stats.modified++;
        detail = wordDiff(oldParas[op.oldIdx], newParas[op.newIdx]);
        return {
          type: "modified", oldIdx: op.oldIdx, newIdx: op.newIdx,
          oldText: oldParas[op.oldIdx], newText: newParas[op.newIdx], detail,
        };
    }
  });

  return { stats, changes };
}

/**
 * 表格差异 — 逐单元格对比
 */
function diffTables(oldDocXml, newDocXml) {
  const oldTables = XmlTableOps.listTables(oldDocXml);
  const newTables = XmlTableOps.listTables(newDocXml);

  const maxLen = Math.max(oldTables.length, newTables.length);
  const stats = { added: 0, deleted: 0, modified: 0, unchanged: 0 };
  const tables = [];

  for (let i = 0; i < maxLen; i++) {
    const oldExists = i < oldTables.length;
    const newExists = i < newTables.length;

    if (!oldExists) {
      stats.added++;
      const data = XmlTableOps.readTable(newDocXml, i);
      tables.push({ type: "added", index: i, newRows: data.length, data });
      continue;
    }
    if (!newExists) {
      stats.deleted++;
      const data = XmlTableOps.readTable(oldDocXml, i);
      tables.push({ type: "deleted", index: i, oldRows: data.length, data });
      continue;
    }

    const oldData = XmlTableOps.readTable(oldDocXml, i);
    const newData = XmlTableOps.readTable(newDocXml, i);

    const cellChanges = [];
    const maxR = Math.max(oldData.length, newData.length);

    for (let r = 0; r < maxR; r++) {
      const oldRow = oldData[r] || [];
      const newRow = newData[r] || [];
      const maxC = Math.max(oldRow.length, newRow.length);
      for (let c = 0; c < maxC; c++) {
        const oldVal = oldRow[c] || "";
        const newVal = newRow[c] || "";
        if (oldVal !== newVal) {
          cellChanges.push({ row: r, col: c, old: oldVal, new: newVal });
        }
      }
    }

    if (cellChanges.length > 0) {
      stats.modified++;
      tables.push({ type: "modified", index: i, oldRows: oldData.length, newRows: newData.length, cellChanges });
    } else {
      stats.unchanged++;
      tables.push({ type: "equal", index: i });
    }
  }

  return { stats, tables };
}

/**
 * 图片差异 — MD5 对比
 */
async function diffImages(oldDocx, newDocx) {
  const oldImgs = ImageOps.listImages(oldDocx);
  const newImgs = ImageOps.listImages(newDocx);

  const oldNames = new Set(oldImgs.map((im) => im.name));
  const newNames = new Set(newImgs.map((im) => im.name));

  const stats = { added: 0, deleted: 0, modified: 0, unchanged: 0 };
  const images = [];

  // 共有图片 — MD5 对比
  for (const oldImg of oldImgs) {
    if (newNames.has(oldImg.name)) {
      const oldBuf = await oldDocx.readFile(`word/media/${oldImg.name}`);
      const newBuf = await newDocx.readFile(`word/media/${oldImg.name}`);
      const oldMd5 = crypto.createHash("md5").update(oldBuf).digest("hex");
      const newMd5 = crypto.createHash("md5").update(newBuf).digest("hex");

      if (oldMd5 === newMd5) {
        stats.unchanged++;
        images.push({ type: "equal", name: oldImg.name });
      } else {
        stats.modified++;
        images.push({ type: "modified", name: oldImg.name });
      }
    } else {
      stats.deleted++;
      images.push({ type: "deleted", name: oldImg.name });
    }
  }

  // 新增图片
  for (const newImg of newImgs) {
    if (!oldNames.has(newImg.name)) {
      stats.added++;
      images.push({ type: "added", name: newImg.name });
    }
  }

  return { stats, images };
}

/**
 * 页眉页脚差异
 */
async function diffHeadersFooters(oldDocx, newDocx) {
  const oldHF = HeaderFooterOps.getHeaderFooterFiles(oldDocx);
  const newHF = HeaderFooterOps.getHeaderFooterFiles(newDocx);

  const result = { headers: [], footers: [] };

  // Headers
  const oldHeaderSet = new Set(oldHF.headers);
  const newHeaderSet = new Set(newHF.headers);

  for (const h of oldHF.headers) {
    const oldXml = await oldDocx.readXml(h);
    const oldText = HeaderFooterOps.readText(oldXml).join("\n");
    if (newHeaderSet.has(h)) {
      const newXml = await newDocx.readXml(h);
      const newText = HeaderFooterOps.readText(newXml).join("\n");
      result.headers.push({
        type: oldText === newText ? "equal" : "modified",
        file: h, old: oldText, new: newText,
      });
    } else {
      result.headers.push({ type: "deleted", file: h, old: oldText });
    }
  }
  for (const h of newHF.headers) {
    if (!oldHeaderSet.has(h)) {
      const newXml = await newDocx.readXml(h);
      const newText = HeaderFooterOps.readText(newXml).join("\n");
      result.headers.push({ type: "added", file: h, new: newText });
    }
  }

  // Footers
  const oldFooterSet = new Set(oldHF.footers);
  const newFooterSet = new Set(newHF.footers);

  for (const f of oldHF.footers) {
    const oldXml = await oldDocx.readXml(f);
    const oldText = HeaderFooterOps.readText(oldXml).join("\n");
    if (newFooterSet.has(f)) {
      const newXml = await newDocx.readXml(f);
      const newText = HeaderFooterOps.readText(newXml).join("\n");
      result.footers.push({
        type: oldText === newText ? "equal" : "modified",
        file: f, old: oldText, new: newText,
      });
    } else {
      result.footers.push({ type: "deleted", file: f, old: oldText });
    }
  }
  for (const f of newHF.footers) {
    if (!oldFooterSet.has(f)) {
      const newXml = await newDocx.readXml(f);
      const newText = HeaderFooterOps.readText(newXml).join("\n");
      result.footers.push({ type: "added", file: f, new: newText });
    }
  }

  return result;
}

/**
 * 元数据差异
 */
async function diffMeta(oldDocx, newDocx) {
  const oldCoreXml = await oldDocx.readXml("docProps/core.xml");
  const newCoreXml = await newDocx.readXml("docProps/core.xml");
  const oldAppXml = await oldDocx.readXml("docProps/app.xml");
  const newAppXml = await newDocx.readXml("docProps/app.xml");

  const oldMeta = { ...(oldCoreXml ? MetaOps.read(oldCoreXml) : {}), ...(oldAppXml ? MetaOps.readApp(oldAppXml) : {}) };
  const newMeta = { ...(newCoreXml ? MetaOps.read(newCoreXml) : {}), ...(newAppXml ? MetaOps.readApp(newAppXml) : {}) };

  const allKeys = new Set([...Object.keys(oldMeta), ...Object.keys(newMeta)]);
  const changes = [];

  for (const key of allKeys) {
    const oldVal = oldMeta[key] || "";
    const newVal = newMeta[key] || "";
    if (oldVal !== newVal) {
      changes.push({ key, old: oldVal, new: newVal });
    }
  }

  return { changes };
}

/**
 * 汇总所有差异
 */
async function fullDiff(oldDocx, newDocx) {
  const oldDocXml = await oldDocx.readXml("word/document.xml");
  const newDocXml = await newDocx.readXml("word/document.xml");

  const [paragraphs, tables, images, headersFooters, meta] = await Promise.all([
    Promise.resolve(diffParagraphs(oldDocXml, newDocXml)),
    Promise.resolve(diffTables(oldDocXml, newDocXml)),
    diffImages(oldDocx, newDocx),
    diffHeadersFooters(oldDocx, newDocx),
    diffMeta(oldDocx, newDocx),
  ]);

  return { paragraphs, tables, images, headersFooters, meta };
}

module.exports = { DiffOps: { diffParagraphs, diffTables, diffImages, diffHeadersFooters, diffMeta, fullDiff, _wordDiff: wordDiff } };
