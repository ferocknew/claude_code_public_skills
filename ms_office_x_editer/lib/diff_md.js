/**
 * DiffMd — 差异报告 Markdown 格式化
 *
 * 将 DiffOps.fullDiff() 返回的结构化数据转为 Markdown 报告。
 * 全部使用表格呈现，风格参考 git diff / IDE。
 */

function now() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function esc(text) {
  return (text || "").replace(/\|/g, "\\|").replace(/\n/g, "↵");
}

function trunc(text, max) {
  if (!text || text.length <= max) return text;
  return text.substring(0, max) + "…";
}

// ─── 概要统计 ─────────────────────────────────────────────────

function formatSummary(result, oldPath, newPath) {
  const lines = [];
  lines.push("# 文档差异概要");
  lines.push("");
  lines.push(`| | |`);
  lines.push(`|------|------|`);
  lines.push(`| 基准文档 | ${oldPath} |`);
  lines.push(`| 对比文档 | ${newPath} |`);
  lines.push(`| 生成时间 | ${now()} |`);
  lines.push("");

  lines.push("## 统计");
  lines.push("");

  const ps = result.paragraphs.stats;
  const ts = result.tables.stats;
  const ims = result.images.stats;
  const hfChanged = [...result.headersFooters.headers, ...result.headersFooters.footers]
    .filter((h) => h.type !== "equal").length;
  const metaCount = result.meta.changes.length;

  lines.push("| 维度 | `+` 新增 | `-` 删除 | `~` 修改 | 未变 |");
  lines.push("|------|----------|----------|----------|------|");
  lines.push(`| 段落 | ${ps.added} | ${ps.deleted} | ${ps.modified} | ${ps.unchanged} |`);
  lines.push(`| 表格 | ${ts.added} | ${ts.deleted} | ${ts.modified} | ${ts.unchanged || "—"} |`);
  lines.push(`| 图片 | ${ims.added} | ${ims.deleted} | ${ims.modified} | ${ims.unchanged || "—"} |`);
  lines.push(`| 页眉页脚 | — | — | ${hfChanged || "—"} | — |`);
  lines.push(`| 元数据 | — | — | ${metaCount || "—"} | — |`);
  lines.push("");

  const hasChanges = ps.added + ps.deleted + ps.modified > 0 ||
    ts.added + ts.deleted + ts.modified > 0 ||
    ims.added + ims.deleted + ims.modified > 0 ||
    hfChanged > 0 || metaCount > 0;

  if (!hasChanges) {
    lines.push("> ✅ 两个文档完全相同，无差异。");
  } else {
    lines.push("> ⚠️ 检测到差异，使用完整模式查看详情：`node skill.js old.docx diff new.docx`");
  }

  return lines.join("\n");
}

// ─── 完整报告 ─────────────────────────────────────────────────

function formatReport(result, oldPath, newPath) {
  const lines = [];

  // 头部
  lines.push("# 文档差异报告");
  lines.push("");
  lines.push(`| | |`);
  lines.push(`|------|------|`);
  lines.push(`| 基准文档 | ${oldPath} |`);
  lines.push(`| 对比文档 | ${newPath} |`);
  lines.push(`| 生成时间 | ${now()} |`);
  lines.push("");

  // 概要
  appendSummaryTable(result, lines);

  // 段落差异
  lines.push("## 段落差异");
  lines.push("");
  formatParagraphs(result.paragraphs, lines);

  // 表格差异
  lines.push("## 表格差异");
  lines.push("");
  formatTables(result.tables, lines);

  // 图片差异
  lines.push("## 图片差异");
  lines.push("");
  formatImages(result.images, lines);

  // 页眉页脚
  lines.push("## 页眉页脚");
  lines.push("");
  formatHeadersFooters(result.headersFooters, lines);

  // 元数据
  lines.push("## 元数据");
  lines.push("");
  formatMeta(result.meta, lines);

  return lines.join("\n");
}

// ─── 概要表格 ─────────────────────────────────────────────────

function appendSummaryTable(result, lines) {
  const ps = result.paragraphs.stats;
  const ts = result.tables.stats;
  const ims = result.images.stats;
  const hfChanged = [...result.headersFooters.headers, ...result.headersFooters.footers]
    .filter((h) => h.type !== "equal").length;
  const metaCount = result.meta.changes.length;

  lines.push("### 概要");
  lines.push("");
  lines.push("| 维度 | `+` 新增 | `-` 删除 | `~` 修改 | 未变 |");
  lines.push("|------|----------|----------|----------|------|");
  lines.push(`| 段落 | ${ps.added} | ${ps.deleted} | ${ps.modified} | ${ps.unchanged} |`);
  lines.push(`| 表格 | ${ts.added} | ${ts.deleted} | ${ts.modified} | ${ts.unchanged || "—"} |`);
  lines.push(`| 图片 | ${ims.added} | ${ims.deleted} | ${ims.modified} | ${ims.unchanged || "—"} |`);
  lines.push(`| 页眉页脚 | — | — | ${hfChanged || "—"} | — |`);
  lines.push(`| 元数据 | — | — | ${metaCount || "—"} | — |`);
  lines.push("");
}

// ─── 段落格式化（git diff 风格表格）───────────────────────────

function formatParagraphs(paragraphs, lines) {
  const changes = paragraphs.changes.filter((c) => c.type !== "equal");

  if (changes.length === 0) {
    lines.push("> 无变化");
    lines.push("");
    return;
  }

  // 修改项：基准 vs 对比 vs 差异 三列
  const modified = changes.filter((c) => c.type === "modified");
  if (modified.length > 0) {
    lines.push("#### `~` 修改");
    lines.push("");
    lines.push("| # | 基准文档 | 对比文档 | 差异 |");
    lines.push("|---|----------|----------|------|");
    for (const c of modified) {
      const diff = formatWordDiff(c.detail);
      lines.push(`| ¶${c.oldIdx + 1} | ${esc(trunc(c.oldText, 120))} | ${esc(trunc(c.newText, 120))} | ${diff} |`);
    }
    lines.push("");
  }

  // 删除项：内容 + 差异列
  const deleted = changes.filter((c) => c.type === "deleted");
  if (deleted.length > 0) {
    lines.push("#### `-` 删除");
    lines.push("");
    lines.push("| # | 内容 | 差异 |");
    lines.push("|---|------|------|");
    for (const c of deleted) {
      lines.push(`| ¶${c.oldIdx + 1} | ${esc(trunc(c.text, 200))} | ~~${esc(trunc(c.text, 200))}~~ |`);
    }
    lines.push("");
  }

  // 新增项：内容 + 差异列
  const added = changes.filter((c) => c.type === "added");
  if (added.length > 0) {
    lines.push("#### `+` 新增");
    lines.push("");
    lines.push("| # | 内容 | 差异 |");
    lines.push("|---|------|------|");
    for (const c of added) {
      lines.push(`| ¶${c.newIdx + 1} | ${esc(trunc(c.text, 200))} | **${esc(trunc(c.text, 200))}** |`);
    }
    lines.push("");
  }
}

/**
 * 将词级 diff 片段转为 Markdown 行内格式
 * equal → 原样, deleted → ~~删除线~~, inserted → **加粗**
 */
function formatWordDiff(segments) {
  if (!segments) return "";
  return segments.map((s) => {
    switch (s.type) {
      case "equal": return esc(s.value);
      case "deleted": return `~~${esc(s.value)}~~`;
      case "inserted": return `**${esc(s.value)}**`;
      default: return esc(s.value);
    }
  }).join("");
}

/**
 * 从两段文本直接生成行内差异（用于表格单元格等无预计算 detail 的场景）
 */
function formatWordDiffFromTexts(oldText, newText) {
  if (oldText === newText) return "—";
  // 引用 diff_ops 中的 wordDiff
  try {
    const { DiffOps } = require("./diff_ops");
    const segs = DiffOps._wordDiff(oldText, newText);
    return formatWordDiff(segs);
  } catch (e) {
    // fallback
    return `~~${esc(trunc(oldText, 60))}~~ → **${esc(trunc(newText, 60))}**`;
  }
}

// ─── 表格差异（git diff 风格）─────────────────────────────────

function formatTables(tables, lines) {
  const changed = tables.tables.filter((t) => t.type !== "equal");

  if (changed.length === 0) {
    lines.push("> 无变化");
    lines.push("");
    return;
  }

  // 汇总表
  lines.push("| # | 操作 | 行数变化 |");
  lines.push("|---|------|----------|");
  for (const t of changed) {
    if (t.type === "added") {
      lines.push(`| 表格${t.index} | \`+\` 新增 | ${t.newRows} 行 |`);
    } else if (t.type === "deleted") {
      lines.push(`| 表格${t.index} | \`-\` 删除 | ${t.oldRows} 行 |`);
    } else {
      const rowInfo = t.oldRows === t.newRows ? `${t.newRows} 行` : `${t.oldRows}→${t.newRows} 行`;
      lines.push(`| 表格${t.index} | \`~\` 修改 | ${rowInfo} |`);
    }
  }
  lines.push("");

  // 修改表格的逐单元格详情
  const modifiedTables = changed.filter((t) => t.type === "modified" && t.cellChanges.length > 0);
  for (const t of modifiedTables) {
    lines.push(`##### 表格${t.index} 单元格差异`);
    lines.push("");
    lines.push("| 行 | 列 | 基准文档 | 对比文档 | 差异 |");
    lines.push("|----|----|----------|----------|------|");
    for (const cc of t.cellChanges) {
      const diff = formatWordDiffFromTexts(cc.old, cc.new);
      lines.push(`| ${cc.row + 1} | ${cc.col + 1} | ${esc(trunc(cc.old, 120))} | ${esc(trunc(cc.new, 120))} | ${diff} |`);
    }
    lines.push("");
  }
}

// ─── 图片差异 ─────────────────────────────────────────────────

function formatImages(images, lines) {
  const changed = images.images.filter((im) => im.type !== "equal");

  if (changed.length === 0) {
    lines.push("> 无变化");
    lines.push("");
    return;
  }

  lines.push("| 操作 | 名称 | 说明 |");
  lines.push("|------|------|------|");
  for (const im of changed) {
    const op = im.type === "added" ? "`+` 新增" : im.type === "deleted" ? "`-` 删除" : "`~` 修改";
    const desc = im.type === "modified" ? "内容已变化" : im.type === "added" ? "新插入" : "已移除";
    lines.push(`| ${op} | ${im.name} | ${desc} |`);
  }
  lines.push("");
}

// ─── 页眉页脚（git diff 风格表格）─────────────────────────────

function formatHeadersFooters(hf, lines) {
  const all = [...hf.headers, ...hf.footers];
  const changed = all.filter((h) => h.type !== "equal");

  if (changed.length === 0) {
    lines.push("> 无变化");
    lines.push("");
    return;
  }

  lines.push("| 位置 | 操作 | 基准文档 | 对比文档 |");
  lines.push("|------|------|----------|----------|");
  for (const item of changed) {
    const kind = item.file.includes("header") ? "页眉" : "页脚";
    const op = item.type === "added" ? "`+`" : item.type === "deleted" ? "`-`" : "`~`";
    const oldVal = item.old ? esc(trunc(item.old, 120)) : "—";
    const newVal = item.new ? esc(trunc(item.new, 120)) : "—";
    lines.push(`| ${kind} ${item.file} | ${op} | ${oldVal} | ${newVal} |`);
  }
  lines.push("");
}

// ─── 元数据（git diff 风格表格）────────────────────────────────

function formatMeta(meta, lines) {
  if (meta.changes.length === 0) {
    lines.push("> 无变化");
    lines.push("");
    return;
  }

  lines.push("| 属性 | 基准文档 | 对比文档 |");
  lines.push("|------|----------|----------|");
  for (const c of meta.changes) {
    lines.push(`| ${c.key} | ${esc(trunc(c.old, 120))} | ${esc(trunc(c.new, 120))} |`);
  }
  lines.push("");
}

module.exports = { DiffMd: { formatReport, formatSummary } };
