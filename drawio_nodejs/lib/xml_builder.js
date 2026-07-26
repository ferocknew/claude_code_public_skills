/**
 * draw.io XML 生成器
 * 生成标准 .drawio XML 格式
 */

// 全局 ID 计数器
let _idCounter = 1;

function nextId() {
  return _idCounter++;
}

function resetIds() {
  _idCounter = 1;
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 创建 drawio 文档骨架
 */
function createDocument() {
  resetIds();
  return {
    root: { id: "0" },
    cells: [],
  };
}

/**
 * 添加顶点（节点）
 */
function addVertex(doc, opts) {
  const id = String(nextId());
  const cell = {
    id,
    vertex: "1",
    parent: opts.parent || "1",
    style: opts.style || "rounded=1;whiteSpace=wrap;html=1;",
    value: opts.value || "",
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 120,
    height: opts.height || 60,
  };
  doc.cells.push(cell);
  return id;
}

/**
 * 添加边（连接线）
 */
function addEdge(doc, opts) {
  const id = String(nextId());
  const cell = {
    id,
    edge: "1",
    parent: opts.parent || "1",
    source: opts.source,
    target: opts.target,
    style: opts.style || "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;",
    value: opts.value || "",
  };
  if (opts.points) {
    cell.points = opts.points;
  }
  doc.cells.push(cell);
  return id;
}

/**
 * 添加容器（分组框）
 */
function addContainer(doc, opts) {
  const id = String(nextId());
  const cell = {
    id,
    vertex: "1",
    parent: opts.parent || "1",
    style: opts.style || "swimlane;startSize=23;",
    value: opts.value || "",
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 300,
    height: opts.height || 200,
  };
  doc.cells.push(cell);
  return id;
}

/**
 * 添加泳道
 */
function addSwimlane(doc, opts) {
  const id = String(nextId());
  const cell = {
    id,
    vertex: "1",
    parent: opts.parent || "1",
    style: "swimlane;startSize=23;fillColor=#dae8fc;strokeColor=#6c8ebf;",
    value: opts.value || "",
    x: opts.x || 0,
    y: opts.y || 0,
    width: opts.width || 300,
    height: opts.height || 200,
  };
  doc.cells.push(cell);
  return id;
}

/**
 * 将 doc 转为 .drawio XML 字符串
 */
function toXml(doc) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<mxfile host="drawio-nodejs" type="device">');
  lines.push('  <diagram id="diagram-1" name="Page-1">');
  lines.push('    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">');
  lines.push('      <root>');
  lines.push('        <mxCell id="0" />');
  lines.push('        <mxCell id="1" parent="0" />');

  for (const cell of doc.cells) {
    if (cell.vertex === "1") {
      let attrs = `id="${cell.id}" value="${escapeXml(cell.value)}" style="${escapeXml(cell.style)}" vertex="1" parent="${cell.parent}"`;
      lines.push(`        <mxCell ${attrs}>`);
      lines.push(`          <mxGeometry x="${cell.x}" y="${cell.y}" width="${cell.width}" height="${cell.height}" as="geometry" />`);
      lines.push(`        </mxCell>`);
    } else if (cell.edge === "1") {
      let attrs = `id="${cell.id}" value="${escapeXml(cell.value)}" style="${escapeXml(cell.style)}" edge="1" parent="${cell.parent}"`;
      if (cell.source) attrs += ` source="${cell.source}"`;
      if (cell.target) attrs += ` target="${cell.target}"`;
      lines.push(`        <mxCell ${attrs}>`);
      lines.push(`          <mxGeometry relative="1" as="geometry" />`);
      lines.push(`        </mxCell>`);
    }
  }

  lines.push('      </root>');
  lines.push('    </mxGraphModel>');
  lines.push('  </diagram>');
  lines.push('</mxfile>');
  return lines.join("\n");
}

/**
 * 从 XML 文件读取并解析为 doc 对象（简化版）
 */
function fromXml(xmlStr) {
  const doc = { root: { id: "0" }, cells: [] };
  const cellRegex = /<mxCell\s+([^>]*)>/g;
  const geoRegex = /<mxGeometry\s+([^>]*)>/;

  let match;
  while ((match = cellRegex.exec(xmlStr)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/id="([^"]*)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (id === "0" || id === "1") continue;

    const cell = { id };

    const valueMatch = attrs.match(/value="([^"]*)"/);
    if (valueMatch) cell.value = valueMatch[1];

    const styleMatch = attrs.match(/style="([^"]*)"/);
    if (styleMatch) cell.style = styleMatch[1];

    const parentMatch = attrs.match(/parent="([^"]*)"/);
    if (parentMatch) cell.parent = parentMatch[1];

    const sourceMatch = attrs.match(/source="([^"]*)"/);
    if (sourceMatch) cell.source = sourceMatch[1];

    const targetMatch = attrs.match(/target="([^"]*)"/);
    if (targetMatch) cell.target = targetMatch[1];

    if (attrs.includes('edge="1"')) {
      cell.edge = "1";
    } else if (attrs.includes('vertex="1"')) {
      cell.vertex = "1";
      const fullCellBlock = xmlStr.slice(match.index);
      const geoMatch = fullCellBlock.match(geoRegex);
      if (geoMatch) {
        const geoAttrs = geoMatch[1];
        const xMatch = geoAttrs.match(/x="([^"]*)"/);
        const yMatch = geoAttrs.match(/y="([^"]*)"/);
        const wMatch = geoAttrs.match(/width="([^"]*)"/);
        const hMatch = geoAttrs.match(/height="([^"]*)"/);
        if (xMatch) cell.x = parseFloat(xMatch[1]);
        if (yMatch) cell.y = parseFloat(yMatch[1]);
        if (wMatch) cell.width = parseFloat(wMatch[1]);
        if (hMatch) cell.height = parseFloat(hMatch[1]);
      }
    }
    doc.cells.push(cell);
  }
  // 更新 id 计数器
  let maxId = 0;
  for (const c of doc.cells) {
    const numId = parseInt(c.id, 10);
    if (!isNaN(numId) && numId > maxId) maxId = numId;
  }
  _idCounter = maxId + 1;
  return doc;
}

module.exports = {
  createDocument, addVertex, addEdge, addContainer, addSwimlane,
  toXml, fromXml, escapeXml, resetIds
};
