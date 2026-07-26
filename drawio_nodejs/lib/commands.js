/**
 * 命令实现
 */

const fs = require("fs");
const path = require("path");
const { getConfig } = require("./api");
const { createDocument, addVertex, addEdge, addContainer, addSwimlane, toXml, fromXml } = require("./xml_builder");
const { SHAPES, COLORS, applyColor, getStyle, listShapes } = require("./shapes");

// ==================== status ====================
async function cmdStatus(opts) {
  const config = getConfig();
  const baseUrl = opts.url || config.url;
  try {
    const res = await fetch(baseUrl, { method: "HEAD", signal: AbortSignal.timeout(10000) });
    return {
      success: true,
      url: baseUrl,
      status: res.status,
      message: `draw.io 服务可访问 (HTTP ${res.status})`,
    };
  } catch (e) {
    return {
      success: false,
      url: baseUrl,
      error: "连接失败",
      message: `无法连接 ${baseUrl}：${e.message}`,
    };
  }
}

// ==================== new (创建新图) ====================
async function cmdNew(opts, positional) {
  const name = positional[0] || "untitled";
  const doc = createDocument();

  // 如果指定了模板
  if (opts.template === "flowchart") {
    createFlowchartTemplate(doc);
  } else if (opts.template === "sequence") {
    createSequenceTemplate(doc);
  } else if (opts.template === "architecture") {
    createArchitectureTemplate(doc);
  }

  const xml = toXml(doc);
  const outFile = opts.output || `${name}.drawio`;
  fs.writeFileSync(outFile, xml, "utf8");

  return {
    success: true,
    file: path.resolve(outFile),
    message: `已创建空白图表: ${outFile}`,
    editUrl: buildEditUrl(opts, xml),
  };
}

// ==================== add (添加节点) ====================
async function cmdAdd(opts, positional) {
  const file = positional[0];
  const label = positional[1];
  if (!file || !label) return { success: false, message: "需要文件路径和节点文本" };

  const xmlStr = fs.readFileSync(file, "utf8");
  const doc = fromXml(xmlStr);

  const shape = opts.shape || "roundedRect";
  const color = opts.color || null;
  let style = opts.style || getStyle(shape);
  if (color) style = applyColor(style, color);

  const id = addVertex(doc, {
    value: label,
    style,
    x: parseInt(opts.x) || 0,
    y: parseInt(opts.y) || 0,
    width: parseInt(opts.width) || 120,
    height: parseInt(opts.height) || 60,
    parent: opts.parent || "1",
  });

  const outXml = toXml(doc);
  fs.writeFileSync(file, outXml, "utf8");

  return {
    success: true,
    id,
    file: path.resolve(file),
    message: `已添加节点 "${label}" (id=${id})`,
  };
}

// ==================== connect (连接节点) ====================
async function cmdConnect(opts, positional) {
  const file = positional[0];
  const source = positional[1];
  const target = positional[2];
  if (!file || !source || !target) return { success: false, message: "需要文件路径、源节点ID和目标节点ID" };

  const xmlStr = fs.readFileSync(file, "utf8");
  const doc = fromXml(xmlStr);

  let edgeStyle = opts.style || "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;";
  if (opts.label) {
    edgeStyle += `labelBackgroundColor=#ffffff;`;
  }

  const id = addEdge(doc, {
    source,
    target,
    style: edgeStyle,
    value: opts.label || "",
  });

  const outXml = toXml(doc);
  fs.writeFileSync(file, outXml, "utf8");

  return {
    success: true,
    id,
    file: path.resolve(file),
    message: `已连接 ${source} -> ${target} (id=${id})`,
  };
}

// ==================== batch (批量操作) ====================
async function cmdBatch(opts, positional) {
  const file = positional[0];
  const jsonFile = positional[1];
  if (!file || !jsonFile) return { success: false, message: "需要文件路径和 JSON 数据文件" };

  const dataStr = fs.readFileSync(jsonFile, "utf8");
  const data = JSON.parse(dataStr);

  let doc;
  if (fs.existsSync(file)) {
    const xmlStr = fs.readFileSync(file, "utf8");
    doc = fromXml(xmlStr);
  } else {
    doc = createDocument();
  }

  const idMap = {};

  // 添加节点
  if (data.nodes) {
    for (const node of data.nodes) {
      const shape = node.shape || "roundedRect";
      let style = node.style || getStyle(shape);
      if (node.color) style = applyColor(style, node.color);

      const id = addVertex(doc, {
        value: node.label || node.value || "",
        style,
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 120,
        height: node.height || 60,
        parent: node.parent || "1",
      });
      if (node.id) idMap[node.id] = id;
    }
  }

  // 添加连接
  if (data.edges) {
    for (const edge of data.edges) {
      const source = idMap[edge.source] || edge.source;
      const target = idMap[edge.target] || edge.target;
      addEdge(doc, {
        source,
        target,
        style: edge.style || undefined,
        value: edge.label || "",
      });
    }
  }

  // 添加容器
  if (data.containers) {
    for (const c of data.containers) {
      const id = addContainer(doc, {
        value: c.label || "",
        x: c.x || 0,
        y: c.y || 0,
        width: c.width || 300,
        height: c.height || 200,
        style: c.style || undefined,
      });
      if (c.id) idMap[c.id] = id;
    }
  }

  const outXml = toXml(doc);
  fs.writeFileSync(file, outXml, "utf8");

  return {
    success: true,
    file: path.resolve(file),
    nodeCount: (data.nodes || []).length,
    edgeCount: (data.edges || []).length,
    message: `批量操作完成: ${(data.nodes || []).length} 节点, ${(data.edges || []).length} 连接`,
  };
}

// ==================== export (导出) ====================
async function cmdExport(opts, positional) {
  const file = positional[0];
  const format = (positional[1] || "svg").toLowerCase();
  if (!file) return { success: false, message: "需要文件路径" };

  // 支持的导出格式
  const supported = ["svg", "png", "pdf", "jpeg", "jpg", "xml", "html"];
  if (!supported.includes(format)) {
    return { success: false, message: `不支持的格式: ${format}，支持: ${supported.join(", ")}` };
  }

  const xmlStr = fs.readFileSync(file, "utf8");
  const config = getConfig();
  const baseUrl = opts.url || config.url;

  // draw.io 导出后端接受 application/x-www-form-urlencoded
  const form = new URLSearchParams();
  form.append("format", format === "jpg" ? "jpeg" : format);
  form.append("xml", xmlStr);
  if (opts.scale) form.append("scale", String(opts.scale));
  if (opts.bg) form.append("bg", opts.bg);
  if (opts.border) form.append("border", String(opts.border));

  try {
    const res = await fetch(`${baseUrl}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      let detail = "";
      try { detail = (await res.text()).slice(0, 200); } catch {}
      return exportFallback(opts, file, format, baseUrl,
        `导出服务返回 HTTP ${res.status}${detail ? `（${detail}）` : "（服务端可能未启用导出后端）"}`);
    }

    const ext = format === "jpeg" ? "jpg" : format;
    const outFile = opts.output || file.replace(/\.(drawio|xml)$/, `.${ext}`);

    // 文本格式（svg/xml/html）直接保存为 utf8
    if (["svg", "xml", "html"].includes(format)) {
      const text = await res.text();
      if (format === "svg" && !text.trim().startsWith("<")) {
        return exportFallback(opts, file, format, baseUrl, "导出服务返回非 SVG 内容");
      }
      fs.writeFileSync(outFile, text, "utf8");
    } else {
      // 二进制格式（png/pdf/jpeg）
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outFile, buf);
    }

    return {
      success: true,
      file: path.resolve(outFile),
      format,
      message: `已导出为 ${format}: ${outFile}`,
    };
  } catch (e) {
    const reason = (e.name === "TimeoutError" || e.name === "AbortError")
      ? "导出超时（60s）"
      : e.message;
    return exportFallback(opts, file, format, baseUrl, reason);
  }
}

// 导出降级：服务端无导出后端时，给出浏览器导出指引
function exportFallback(opts, file, format, baseUrl, reason) {
  return {
    success: false,
    error: "导出失败",
    format,
    reason,
    message: `无法通过服务端导出（${reason}）。可改用：\n1. 生成编辑 URL 后在浏览器中导出: node skill.js edit ${file}\n2. 确认 draw.io 部署已启用导出后端（ExportServlet / DRAWIO_SERVER_URL 指向 export-server）`,
    tip: "draw.io 标准前端部署默认不含 REST 导出 API，需独立部署 export-server 才支持命令行导出。",
  };
}

// ==================== edit (生成编辑URL) ====================
async function cmdEdit(opts, positional) {
  const file = positional[0];
  if (!file) return { success: false, message: "需要文件路径" };

  const xmlStr = fs.readFileSync(file, "utf8");
  const config = getConfig();
  const baseUrl = opts.url || config.url;

  return {
    success: true,
    file: path.resolve(file),
    editUrl: `${baseUrl}/#R${encodeURIComponent(xmlStr)}`,
    message: `在浏览器中打开此 URL 编辑图表`,
  };
}

// ==================== view (生成只读URL) ====================
async function cmdView(opts, positional) {
  const file = positional[0];
  if (!file) return { success: false, message: "需要文件路径" };

  const xmlStr = fs.readFileSync(file, "utf8");
  const config = getConfig();
  const baseUrl = opts.url || config.url;

  return {
    success: true,
    file: path.resolve(file),
    viewUrl: `${baseUrl}/?lightbox=1#R${encodeURIComponent(xmlStr)}`,
    message: `在浏览器中打开此 URL 查看图表（只读）`,
  };
}

// ==================== shapes (列出形状) ====================
async function cmdShapes(opts) {
  const names = listShapes();
  const query = opts.query || opts.filter || null;
  let filtered = names;
  if (query) {
    const q = query.toLowerCase();
    filtered = names.filter(n => n.toLowerCase().includes(q));
  }
  return {
    success: true,
    count: filtered.length,
    shapes: filtered,
    colors: Object.keys(COLORS),
  };
}

// ==================== config ====================
function cmdConfig() {
  const config = getConfig();
  return {
    success: true,
    url: config.url,
    rejectUnauthorized: config.rejectUnauthorized,
  };
}

// ==================== help (打印到 stderr) ====================
function cmdHelp() {
  return {
    success: true,
    message: "使用 --help 查看完整帮助",
  };
}

// ==================== 辅助函数 ====================

function buildEditUrl(opts, xml) {
  const config = getConfig();
  const baseUrl = (opts.url || config.url).replace(/\/+$/, "");
  return xml ? `${baseUrl}/#R${encodeURIComponent(xml)}` : baseUrl;
}

function createFlowchartTemplate(doc) {
  const s = addVertex(doc, { value: "开始", style: getStyle("startEnd"), x: 200, y: 20, width: 100, height: 40 });
  const p1 = addVertex(doc, { value: "处理", style: getStyle("process"), x: 200, y: 100, width: 100, height: 60 });
  const d = addVertex(doc, { value: "判断?", style: getStyle("decision"), x: 190, y: 200, width: 120, height: 80 });
  const p2 = addVertex(doc, { value: "处理A", style: getStyle("process"), x: 80, y: 330, width: 100, height: 60 });
  const p3 = addVertex(doc, { value: "处理B", style: getStyle("process"), x: 320, y: 330, width: 100, height: 60 });
  const e = addVertex(doc, { value: "结束", style: getStyle("startEnd"), x: 200, y: 440, width: 100, height: 40 });

  addEdge(doc, { source: s, target: p1 });
  addEdge(doc, { source: p1, target: d });
  addEdge(doc, { source: d, target: p2, value: "是" });
  addEdge(doc, { source: d, target: p3, value: "否" });
  addEdge(doc, { source: p2, target: e });
  addEdge(doc, { source: p3, target: e });
}

function createSequenceTemplate(doc) {
  const lane1 = addContainer(doc, { value: "用户", x: 20, y: 20, width: 200, height: 400 });
  const lane2 = addContainer(doc, { value: "系统", x: 260, y: 20, width: 200, height: 400 });
  const lane3 = addContainer(doc, { value: "数据库", x: 500, y: 20, width: 200, height: 400 });

  const u1 = addVertex(doc, { value: "用户", style: getStyle("actor"), x: 80, y: 60, width: 40, height: 60, parent: lane1 });
  const s1 = addVertex(doc, { value: "系统", style: getStyle("rect"), x: 310, y: 60, width: 80, height: 40, parent: lane2 });
  const d1 = addVertex(doc, { value: "数据库", style: getStyle("database"), x: 550, y: 60, width: 60, height: 60, parent: lane3 });
}

function createArchitectureTemplate(doc) {
  const lb = addVertex(doc, { value: "Load Balancer", style: getStyle("roundedRect"), x: 250, y: 20, width: 140, height: 50 });
  const svc1 = addVertex(doc, { value: "Service A", style: applyColor(getStyle("roundedRect"), "blue"), x: 100, y: 120, width: 120, height: 50 });
  const svc2 = addVertex(doc, { value: "Service B", style: applyColor(getStyle("roundedRect"), "green"), x: 260, y: 120, width: 120, height: 50 });
  const svc3 = addVertex(doc, { value: "Service C", style: applyColor(getStyle("roundedRect"), "orange"), x: 420, y: 120, width: 120, height: 50 });
  const db = addVertex(doc, { value: "Database", style: getStyle("database"), x: 260, y: 230, width: 80, height: 60 });
  const cache = addVertex(doc, { value: "Cache", style: applyColor(getStyle("cylinder"), "teal"), x: 100, y: 230, width: 60, height: 50 });

  addEdge(doc, { source: lb, target: svc1 });
  addEdge(doc, { source: lb, target: svc2 });
  addEdge(doc, { source: lb, target: svc3 });
  addEdge(doc, { source: svc1, target: db });
  addEdge(doc, { source: svc2, target: db });
  addEdge(doc, { source: svc3, target: db });
  addEdge(doc, { source: svc1, target: cache });
}

module.exports = {
  cmdStatus, cmdNew, cmdAdd, cmdConnect, cmdBatch,
  cmdExport, cmdEdit, cmdView, cmdShapes, cmdConfig, cmdHelp,
};
