/**
 * DiffMd — 差异报告 Markdown 格式化
 *
 * 将 DiffOps.fullDiff() 返回的结构化数据转为 Markdown 报告。
 * 支持:
 *   - 完整报告（formatReport）
 *   - 概要统计（formatSummary）
 */

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function esc(text) {
  return (text || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// ─── 概要统计 ─────────────────────────────────────────────────

function formatSummary(result, oldPath, newPath) {
  const lines = [];
  lines.push(`# 文档差异概要`);
  lines.push("");
  lines.push(`- **基准文档**: ${oldPath}`);
  lines.push(`- **对比文档**: ${newPath}`);
  lines.push(`- **生成时间**: ${now()}`);
  lines.push("");
  lines.push("## 统计");
  lines.push("");

  // 段落
  const ps = result.paragraphs.stats;
  const hasChanges = ps.added + ps.deleted + ps.modified > 0 ||
    result.tables.stats.added + result.tables.stats.deleted + result.tables.stats.modified > 0 ||
    result.images.stats.added + result.images.stats.deleted + result.images.stats.modified > 0;

  lines.push("| 维度 | 新增 | 删除 | 修改 | 未变 |");
  lines.push("|------|------|------|------|------|");
  lines.push(`| 段落 | ${ps.added} | ${ps.deleted} | ${ps.modified} | ${ps.unchanged} |`);

  const ts = result.tables.stats;
  lines.push(`| 表格 | ${ts.added} | ${ts.deleted} | ${ts.modified} | ${ts.unchanged || "—"} |`);

  const ims = result.images.stats;
  lines.push(`| 图片 | ${ims.added} | ${ims.deleted} | ${ims.modified} | ${ims.unchanged || "—"} |`);

  // 页眉页脚统计
  const hfChanged = [...result.headersFooters.headers, ...result.headersFooters.footers]
    .filter((h) => h.type !== "equal").length;
  lines.push(`| 页眉页脚 | ${hfChanged > 0 ? hfChanged + " 项变更" : "—"} | — | — | — |`);

  // 元数据统计
  const metaCount = result.meta.changes.length;
  lines.push(`| 元数据 | ${metaCount > 0 ? metaCount + " 项变更" : "—"} | — | — | — |`);

  lines.push("");

  if (!hasChanges && hfChanged === 0 && metaCount === 0) {
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
  lines.push(`- **基准文档**: ${oldPath}`);
  lines.push(`- **对比文档**: ${newPath}`);
  lines.push(`- **生成时间**: ${now()}`);
  lines.push("");

  // 概要
  lines.push("## 概要");
  lines.push("");
  lines.push(formatSummary(result, oldPath, newPath).split("\n").slice(5).join("\n"));

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

// ─── 段落格式化 ───────────────────────────────────────────────

function formatParagraphs(paragraphs, lines) {
  let paraNum = 0;
  const changes = paragraphs.changes.filter((c) => c.type !== "equal");

  if (changes.length === 0) {
    lines.push("无变化");
    lines.push("");
    return;
  }

  for (const c of changes) {
    paraNum++;
    if (c.type === "modified") {
      lines.push(`### ¶${paraNum} [修改]`);
      lines.push("");
      lines.push(`- **旧**: ${esc(c.oldText)}`);
      lines.push(`- **新**: ${esc(c.newText)}`);
      lines.push(`- **差异**: ${formatWordDiff(c.detail)}`);
      lines.push("");
    } else if (c.type === "deleted") {
      lines.push(`### ¶${paraNum} [删除]`);
      lines.push("");
      lines.push(`- ~~${esc(c.text)}~~`);
      lines.push("");
    } else if (c.type === "added") {
      lines.push(`### ¶${paraNum} [新增]`);
      lines.push("");
      lines.push(`- **${esc(c.text)}**`);
      lines.push("");
    }
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
      case "equal": return s.value;
      case "deleted": return `~~${s.value}~~`;
      case "inserted": return `**${s.value}**`;
      default: return s.value;
    }
  }).join("");
}

// ─── 表格格式化 ───────────────────────────────────────────────

function formatTables(tables, lines) {
  const changed = tables.tables.filter((t) => t.type !== "equal");

  if (changed.length === 0) {
    lines.push("无变化");
    lines.push("");
    return;
  }

  for (const t of changed) {
    if (t.type === "added") {
      lines.push(`### 表格 ${t.index} [新增]`);
      lines.push("");
      lines.push(`${t.newRows} 行`);
      lines.push("");
    } else if (t.type === "deleted") {
      lines.push(`### 表格 ${t.index} [删除]`);
      lines.push("");
      lines.push(`${t.oldRows} 行`);
      lines.push("");
    } else if (t.type === "modified") {
      lines.push(`### 表格 ${t.index} [修改]`);
      lines.push("");
      if (t.cellChanges.length > 0) {
        lines.push("| 位置 | 旧值 | 新值 |");
        lines.push("|------|------|------|");
        for (const cc of t.cellChanges) {
          lines.push(`| 第${cc.row + 1}行第${cc.col + 1}列 | ${esc(cc.old)} | ${esc(cc.new)} |`);
        }
        lines.push("");
      }
    }
  }
}

// ─── 图片格式化 ───────────────────────────────────────────────

function formatImages(images, lines) {
  const changed = images.images.filter((im) => im.type !== "equal");

  if (changed.length === 0) {
    lines.push("无变化");
    lines.push("");
    return;
  }

  lines.push("| 变更 | 名称 | 说明 |");
  lines.push("|------|------|------|");
  for (const im of changed) {
    const label = im.type === "added" ? "新增" : im.type === "deleted" ? "删除" : "修改";
    const desc = im.type === "modified" ? "内容已变化" : im.type === "added" ? "新插入" : "已移除";
    lines.push(`| ${label} | ${im.name} | ${desc} |`);
  }
  lines.push("");
}

// ─── 页眉页脚格式化 ───────────────────────────────────────────

function formatHeadersFooters(hf, lines) {
  const all = [...hf.headers, ...hf.footers];
  const changed = all.filter((h) => h.type !== "equal");

  if (changed.length === 0) {
    lines.push("无变化");
    lines.push("");
    return;
  }

  for (const item of changed) {
    const kind = item.file.includes("header") ? "页眉" : "页脚";
    const label = item.type === "added" ? "新增" : item.type === "deleted" ? "删除" : "修改";
    lines.push(`- **${kind} ${item.file}** [${label}]`);
    if (item.type === "modified") {
      lines.push(`  - 旧: ${esc(item.old)}`);
      lines.push(`  - 新: ${esc(item.new)}`);
    } else if (item.old) {
      lines.push(`  - 内容: ${esc(item.old)}`);
    } else if (item.new) {
      lines.push(`  - 内容: ${esc(item.new)}`);
    }
  }
  lines.push("");
}

// ─── 元数据格式化 ─────────────────────────────────────────────

function formatMeta(meta, lines) {
  if (meta.changes.length === 0) {
    lines.push("无变化");
    lines.push("");
    return;
  }

  lines.push("| 属性 | 旧值 | 新值 |");
  lines.push("|------|------|------|");
  for (const c of meta.changes) {
    lines.push(`| ${c.key} | ${esc(c.old)} | ${esc(c.new)} |`);
  }
  lines.push("");
}

module.exports = { DiffMd: { formatReport, formatSummary } };
