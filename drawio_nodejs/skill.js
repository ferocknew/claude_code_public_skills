#!/usr/bin/env node
// 私有化 draw.io 远程操作工具 v260726.162630 - 无需安装依赖

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var SKILL_VERSION2 = "1.0.0";
    function loadDotEnv2(baseDir) {
      const envPath = path.join(baseDir, ".env");
      if (!fs.existsSync(envPath)) return;
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
    function getConfig() {
      const rawUrl = process.env.DRAWIO_URL || "http://localhost:8080";
      return {
        url: rawUrl.replace(/\/+$/, ""),
        rejectUnauthorized: process.env.DRAWIO_REJECT_UNAUTHORIZED !== "false"
      };
    }
    function initTls2() {
      const config = getConfig();
      if (!config.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }
    }
    async function apiRequest(method, urlPath, body, overrides) {
      const config = getConfig();
      const baseUrl = overrides && overrides.url || config.url;
      const url = `${baseUrl}${urlPath}`;
      const headers = { "Content-Type": "application/json" };
      const options = {
        method,
        headers,
        signal: AbortSignal.timeout(3e4)
      };
      if (body && method !== "GET") {
        options.body = typeof body === "string" ? body : JSON.stringify(body);
      }
      try {
        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("image") || contentType.includes("application/pdf")) {
          const buf = await res.arrayBuffer();
          return { success: true, data: Buffer.from(buf), contentType, status: res.status };
        }
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (!res.ok) {
            return { success: false, error: `HTTP ${res.status}`, message: data.message || `\u8BF7\u6C42\u5931\u8D25: ${res.status}` };
          }
          return { success: true, data, status: res.status };
        } catch {
          if (!res.ok) {
            return { success: false, error: `HTTP ${res.status}`, message: text.slice(0, 500) };
          }
          return { success: true, data: text, status: res.status };
        }
      } catch (e) {
        if (e.name === "TimeoutError" || e.name === "AbortError") {
          return { success: false, error: "\u8BF7\u6C42\u8D85\u65F6", message: `\u8FDE\u63A5 ${baseUrl} \u8D85\u65F6\uFF0830s\uFF09\uFF0C\u8BF7\u68C0\u67E5\u670D\u52A1\u5668\u5730\u5740\u548C\u7F51\u7EDC` };
        }
        return { success: false, error: "\u8BF7\u6C42\u5931\u8D25", message: e.message };
      }
    }
    module2.exports = { SKILL_VERSION: SKILL_VERSION2, loadDotEnv: loadDotEnv2, getConfig, initTls: initTls2, apiRequest };
  }
});

// lib/live.js
var require_live = __commonJS({
  "lib/live.js"(exports2, module2) {
    var http = require("http");
    var fs = require("fs");
    var path = require("path");
    var { exec } = require("child_process");
    var { getConfig } = require_api();
    var DEFAULT_PORT = parseInt(process.env.DRAWIO_LIVE_PORT, 10) || 17777;
    function containerHtml(drawioUrl) {
      return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>draw.io \u5B9E\u65F6\u9884\u89C8</title>
<style>
  html,body{margin:0;padding:0;height:100%;overflow:hidden;font-family:-apple-system,sans-serif;font-size:12px}
  #bar{height:30px;background:#fafafa;border-bottom:1px solid #e8e8e8;line-height:30px;padding:0 12px;color:#888;white-space:nowrap;overflow:hidden}
  #bar .dot{width:8px;height:8px;border-radius:50%;background:#ccc;display:inline-block;margin-right:8px;vertical-align:middle}
  #bar .dot.on{background:#52c41a}
  #bar .tip{color:#bbb;margin-left:8px}
  iframe{border:0;width:100vw;height:calc(100vh - 30px)}
</style>
</head>
<body>
<div id="bar"><span class="dot" id="st"></span><span id="info">\u8FDE\u63A5\u4E2D\u2026</span><span class="tip">draw.io live \xB7 Ctrl+C \u505C\u6B62</span></div>
<iframe id="d" src="${drawioUrl}/?embed=1&proto=json&ui=min"></iframe>
<script>
var iframe=document.getElementById('d'),st=document.getElementById('st'),info=document.getElementById('info');
var ready=false;
function post(o){iframe.contentWindow.postMessage(JSON.stringify(o),'*');}
window.addEventListener('message',function(e){
  var m=e.data;
  if(typeof m==='string'){try{m=JSON.parse(m)}catch(_){return}}
  if(!m||typeof m!=='object')return;
  if(m.event==='init'){
    ready=true;st.classList.add('on');info.textContent='\u5DF2\u8FDE\u63A5 draw.io';
    fetch('/current').then(function(r){return r.json()}).then(function(d){if(d&&d.xml)post({action:'load',xml:d.xml,autosave:0})}).catch(function(){});
  }
});
var es=new EventSource('/sse');
es.addEventListener('xml',function(e){
  var d=JSON.parse(e.data);
  if(ready&&d.xml)post({action:'load',xml:d.xml,autosave:0});
  info.textContent=d.file?('\u5DF2\u66F4\u65B0: '+d.file):'\u5DF2\u66F4\u65B0';
});
es.onerror=function(){st.classList.remove('on');info.textContent='\u8FDE\u63A5\u65AD\u5F00\uFF0C\u91CD\u8FDE\u4E2D\u2026'};
</script>
</body>
</html>`;
    }
    function createServer({ drawioUrl, initialXml, initialFile }) {
      const clients = /* @__PURE__ */ new Set();
      let latestXml = initialXml || "";
      let latestFile = initialFile || "";
      return http.createServer((req, res) => {
        let pathname = req.url || "/";
        const qIdx = pathname.indexOf("?");
        if (qIdx >= 0) pathname = pathname.slice(0, qIdx);
        if (pathname === "/" || pathname === "/index.html") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(containerHtml(drawioUrl));
          return;
        }
        if (pathname === "/sse") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive"
          });
          res.write(":ok\n\n");
          clients.add(res);
          req.on("close", () => clients.delete(res));
          return;
        }
        if (pathname === "/current") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ xml: latestXml, file: latestFile }));
          return;
        }
        if (pathname === "/update" && req.method === "POST") {
          let body = "";
          req.on("data", (c) => body += c);
          req.on("end", () => {
            try {
              const d = JSON.parse(body);
              latestXml = d.xml || latestXml;
              latestFile = d.file || latestFile;
              const payload = "event: xml\ndata: " + JSON.stringify({ xml: latestXml, file: latestFile }) + "\n\n";
              for (const c of clients) c.write(payload);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true, clients: clients.size }));
            } catch (e) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
          return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not found" }));
      });
    }
    function openUrl(url) {
      const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`;
      exec(cmd, () => {
      });
    }
    function cmdLive2(opts, positional) {
      const config = getConfig();
      const drawioUrl = (opts.url || config.url).replace(/\/+$/, "");
      const port = parseInt(opts.port, 10) || DEFAULT_PORT;
      const file = positional[0];
      let initialXml = "";
      let initialFile = "";
      if (file) {
        if (!fs.existsSync(file)) {
          return { success: false, error: "\u6587\u4EF6\u4E0D\u5B58\u5728", message: `\u627E\u4E0D\u5230\u6587\u4EF6: ${file}` };
        }
        initialXml = fs.readFileSync(file, "utf8");
        initialFile = path.resolve(file);
      }
      const openBrowser = opts["no-open"] !== true && String(opts.open) !== "false";
      return new Promise((resolve) => {
        const server = createServer({ drawioUrl, initialXml, initialFile });
        server.on("listening", () => {
          const containerUrl = `http://localhost:${port}/`;
          if (openBrowser) openUrl(containerUrl);
          resolve({
            success: true,
            message: "draw.io live \u9884\u89C8\u670D\u52A1\u5DF2\u542F\u52A8",
            containerUrl,
            drawioUrl,
            port,
            initialFile: initialFile || null,
            tip: "\u53E6\u5F00\u4E00\u4E2A\u7EC8\u7AEF\u6267\u884C add/connect/batch \u7B49\u547D\u4EE4\uFF0C\u6D4F\u89C8\u5668\u5C06\u5B9E\u65F6\u5237\u65B0\u3002Ctrl+C \u505C\u6B62\u670D\u52A1\u3002"
          });
        });
        server.on("error", (e) => {
          resolve({
            success: false,
            error: e.code === "EADDRINUSE" ? "\u7AEF\u53E3\u5360\u7528" : "\u542F\u52A8\u5931\u8D25",
            message: e.code === "EADDRINUSE" ? `\u7AEF\u53E3 ${port} \u5DF2\u88AB\u5360\u7528\uFF0C\u4F7F\u7528 --port \u6307\u5B9A\u5176\u4ED6\u7AEF\u53E3` : e.message
          });
        });
        process.on("SIGINT", () => server.close(() => process.exit(0)));
        process.on("SIGTERM", () => server.close(() => process.exit(0)));
        server.listen(port, "127.0.0.1");
      });
    }
    async function notifyLive(file, xml) {
      const port = parseInt(process.env.DRAWIO_LIVE_PORT, 10) || DEFAULT_PORT;
      try {
        await fetch(`http://127.0.0.1:${port}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file, xml }),
          signal: AbortSignal.timeout(1500)
        });
        return true;
      } catch {
        return false;
      }
    }
    module2.exports = { cmdLive: cmdLive2, notifyLive, DEFAULT_PORT };
  }
});

// lib/xml_builder.js
var require_xml_builder = __commonJS({
  "lib/xml_builder.js"(exports2, module2) {
    var _idCounter = 1;
    function nextId() {
      return _idCounter++;
    }
    function resetIds() {
      _idCounter = 1;
    }
    function escapeXml(str) {
      if (!str) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }
    function createDocument() {
      resetIds();
      return {
        root: { id: "0" },
        cells: []
      };
    }
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
        height: opts.height || 60
      };
      doc.cells.push(cell);
      return id;
    }
    function addEdge(doc, opts) {
      const id = String(nextId());
      const cell = {
        id,
        edge: "1",
        parent: opts.parent || "1",
        source: opts.source,
        target: opts.target,
        style: opts.style || "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;",
        value: opts.value || ""
      };
      if (opts.points) {
        cell.points = opts.points;
      }
      doc.cells.push(cell);
      return id;
    }
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
        height: opts.height || 200
      };
      doc.cells.push(cell);
      return id;
    }
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
        height: opts.height || 200
      };
      doc.cells.push(cell);
      return id;
    }
    function toXml(doc) {
      const lines = [];
      lines.push('<?xml version="1.0" encoding="UTF-8"?>');
      lines.push('<mxfile host="drawio-nodejs" type="device">');
      lines.push('  <diagram id="diagram-1" name="Page-1">');
      lines.push('    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">');
      lines.push("      <root>");
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
      lines.push("      </root>");
      lines.push("    </mxGraphModel>");
      lines.push("  </diagram>");
      lines.push("</mxfile>");
      return lines.join("\n");
    }
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
      let maxId = 0;
      for (const c of doc.cells) {
        const numId = parseInt(c.id, 10);
        if (!isNaN(numId) && numId > maxId) maxId = numId;
      }
      _idCounter = maxId + 1;
      return doc;
    }
    module2.exports = {
      createDocument,
      addVertex,
      addEdge,
      addContainer,
      addSwimlane,
      toXml,
      fromXml,
      escapeXml,
      resetIds
    };
  }
});

// lib/shapes.js
var require_shapes = __commonJS({
  "lib/shapes.js"(exports2, module2) {
    var SHAPES = {
      // 基础形状
      rect: "rounded=0;whiteSpace=wrap;html=1;",
      roundedRect: "rounded=1;whiteSpace=wrap;html=1;",
      circle: "ellipse;whiteSpace=wrap;html=1;",
      diamond: "rhombus;whiteSpace=wrap;html=1;",
      triangle: "triangle;whiteSpace=wrap;html=1;",
      hexagon: "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;",
      cylinder: "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;",
      cloud: "ellipse;shape=cloud;whiteSpace=wrap;html=1;",
      parallelogram: "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;",
      trapezoid: "shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;",
      callout: "shape=callout;whiteSpace=wrap;html=1;perimeter=calloutPerimeter;",
      // 流程图
      process: "rounded=0;whiteSpace=wrap;html=1;",
      decision: "rhombus;whiteSpace=wrap;html=1;",
      startEnd: "rounded=1;whiteSpace=wrap;html=1;arcSize=50;",
      io: "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;",
      predefined: "shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;",
      manual: "shape=manualInput;whiteSpace=wrap;html=1;",
      preparation: "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;",
      delay: "shape=delay;whiteSpace=wrap;html=1;",
      display: "shape=display;whiteSpace=wrap;html=1;",
      document: "shape=document;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;",
      manualOp: "shape=manualOperation;whiteSpace=wrap;html=1;",
      // UML
      class: "swimlane;fontStyle=1;align=center;startSize=26;",
      interface: "swimlane;fontStyle=3;align=center;startSize=26;",
      package: "shape=folder;fontStyle=1;tabWidth=70;tabHeight=30;tabPosition=left;whiteSpace=wrap;html=1;",
      actor: "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;",
      // ERD
      entity: "shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;fontStyle=1;align=center;resizeLast=1;",
      erAttribute: "shape=partialRectangle;whiteSpace=wrap;html=1;top=0;left=0;bottom=0;fillColor=none;overflow=hidden;fontSize=12;",
      // 网络
      server: "shape=mxgraph.cisco.servers.standard_server;whiteSpace=wrap;html=1;",
      firewall: "shape=mxgraph.cisco.firewalls.firewall;whiteSpace=wrap;html=1;",
      router: "shape=mxgraph.cisco.routers.router;whiteSpace=wrap;html=1;",
      switch_: "shape=mxgraph.cisco.switches.workgroup_switch;whiteSpace=wrap;html=1;",
      cloudNet: "ellipse;shape=cloud;whiteSpace=wrap;html=1;fillColor=#f5f5f5;fontColor=#333333;strokeColor=#666666;",
      // AWS
      ec2: "shape=mxgraph.aws4.ec2;whiteSpace=wrap;html=1;",
      s3: "shape=mxgraph.aws4.s3;whiteSpace=wrap;html=1;",
      rds: "shape=mxgraph.aws4.rds;whiteSpace=wrap;html=1;",
      lambda: "shape=mxgraph.aws4.lambda;whiteSpace=wrap;html=1;",
      sqs: "shape=mxgraph.aws4.sqs;whiteSpace=wrap;html=1;",
      vpc: "shape=mxgraph.aws4.vpc;whiteSpace=wrap;html=1;",
      // 容器/K8s
      pod: "shape=mxgraph.k8s.pods;whiteSpace=wrap;html=1;",
      service: "shape=mxgraph.k8s.services;whiteSpace=wrap;html=1;",
      ingress: "shape=mxgraph.k8s.ingress;whiteSpace=wrap;html=1;",
      deployment: "shape=mxgraph.k8s.deployments;whiteSpace=wrap;html=1;",
      // 图标
      database: "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;",
      queue: "shape=mxgraph.basic.queue;whiteSpace=wrap;html=1;",
      lock: "shape=mxgraph.security.locks;whiteSpace=wrap;html=1;",
      user: "shape=mxgraph.office.users.user;whiteSpace=wrap;html=1;",
      // 容器/泳道
      container: "swimlane;whiteSpace=wrap;html=1;startSize=23;",
      containerBold: "swimlane;fontStyle=1;startSize=23;collapsible=0;"
    };
    var COLORS = {
      blue: { fill: "#dae8fc", stroke: "#6c8ebf" },
      green: { fill: "#d5e8d4", stroke: "#82b366" },
      orange: { fill: "#fff2cc", stroke: "#d6b656" },
      red: { fill: "#f8cecc", stroke: "#b85450" },
      purple: { fill: "#e1d5e7", stroke: "#9673a6" },
      gray: { fill: "#f5f5f5", stroke: "#666666" },
      yellow: { fill: "#ffffcc", stroke: "#cccc00" },
      teal: { fill: "#ccffff", stroke: "#009999" },
      pink: { fill: "#ffe6ff", stroke: "#cc00cc" }
    };
    function applyColor(style, colorName) {
      const c = COLORS[colorName];
      if (!c) return style;
      let s = style.replace(/fillColor=[^;]*;?/g, "").replace(/strokeColor=[^;]*;?/g, "");
      return `fillColor=${c.fill};strokeColor=${c.stroke};${s}`;
    }
    function getStyle(shapeName) {
      return SHAPES[shapeName] || SHAPES.rect;
    }
    function listShapes() {
      return Object.keys(SHAPES).sort();
    }
    module2.exports = { SHAPES, COLORS, applyColor, getStyle, listShapes };
  }
});

// lib/commands.js
var require_commands = __commonJS({
  "lib/commands.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var { getConfig } = require_api();
    var { notifyLive } = require_live();
    var { createDocument, addVertex, addEdge, addContainer, addSwimlane, toXml, fromXml } = require_xml_builder();
    var { SHAPES, COLORS, applyColor, getStyle, listShapes } = require_shapes();
    async function cmdStatus2(opts) {
      const config = getConfig();
      const baseUrl = opts.url || config.url;
      try {
        const res = await fetch(baseUrl, { method: "HEAD", signal: AbortSignal.timeout(1e4) });
        return {
          success: true,
          url: baseUrl,
          status: res.status,
          message: `draw.io \u670D\u52A1\u53EF\u8BBF\u95EE (HTTP ${res.status})`
        };
      } catch (e) {
        return {
          success: false,
          url: baseUrl,
          error: "\u8FDE\u63A5\u5931\u8D25",
          message: `\u65E0\u6CD5\u8FDE\u63A5 ${baseUrl}\uFF1A${e.message}`
        };
      }
    }
    async function cmdNew2(opts, positional) {
      const name = positional[0] || "untitled";
      const doc = createDocument();
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
      await notifyLive(path.resolve(outFile), xml);
      return {
        success: true,
        file: path.resolve(outFile),
        message: `\u5DF2\u521B\u5EFA\u7A7A\u767D\u56FE\u8868: ${outFile}`,
        editUrl: buildEditUrl(opts, xml)
      };
    }
    async function cmdAdd2(opts, positional) {
      const file = positional[0];
      const label = positional[1];
      if (!file || !label) return { success: false, message: "\u9700\u8981\u6587\u4EF6\u8DEF\u5F84\u548C\u8282\u70B9\u6587\u672C" };
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
        parent: opts.parent || "1"
      });
      const outXml = toXml(doc);
      fs.writeFileSync(file, outXml, "utf8");
      await notifyLive(path.resolve(file), outXml);
      return {
        success: true,
        id,
        file: path.resolve(file),
        message: `\u5DF2\u6DFB\u52A0\u8282\u70B9 "${label}" (id=${id})`
      };
    }
    async function cmdConnect2(opts, positional) {
      const file = positional[0];
      const source = positional[1];
      const target = positional[2];
      if (!file || !source || !target) return { success: false, message: "\u9700\u8981\u6587\u4EF6\u8DEF\u5F84\u3001\u6E90\u8282\u70B9ID\u548C\u76EE\u6807\u8282\u70B9ID" };
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
        value: opts.label || ""
      });
      const outXml = toXml(doc);
      fs.writeFileSync(file, outXml, "utf8");
      await notifyLive(path.resolve(file), outXml);
      return {
        success: true,
        id,
        file: path.resolve(file),
        message: `\u5DF2\u8FDE\u63A5 ${source} -> ${target} (id=${id})`
      };
    }
    async function cmdBatch2(opts, positional) {
      const file = positional[0];
      const jsonFile = positional[1];
      if (!file || !jsonFile) return { success: false, message: "\u9700\u8981\u6587\u4EF6\u8DEF\u5F84\u548C JSON \u6570\u636E\u6587\u4EF6" };
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
            parent: node.parent || "1"
          });
          if (node.id) idMap[node.id] = id;
        }
      }
      if (data.edges) {
        for (const edge of data.edges) {
          const source = idMap[edge.source] || edge.source;
          const target = idMap[edge.target] || edge.target;
          addEdge(doc, {
            source,
            target,
            style: edge.style || void 0,
            value: edge.label || ""
          });
        }
      }
      if (data.containers) {
        for (const c of data.containers) {
          const id = addContainer(doc, {
            value: c.label || "",
            x: c.x || 0,
            y: c.y || 0,
            width: c.width || 300,
            height: c.height || 200,
            style: c.style || void 0
          });
          if (c.id) idMap[c.id] = id;
        }
      }
      const outXml = toXml(doc);
      fs.writeFileSync(file, outXml, "utf8");
      await notifyLive(path.resolve(file), outXml);
      return {
        success: true,
        file: path.resolve(file),
        nodeCount: (data.nodes || []).length,
        edgeCount: (data.edges || []).length,
        message: `\u6279\u91CF\u64CD\u4F5C\u5B8C\u6210: ${(data.nodes || []).length} \u8282\u70B9, ${(data.edges || []).length} \u8FDE\u63A5`
      };
    }
    async function cmdExport2(opts, positional) {
      const file = positional[0];
      const format = (positional[1] || "svg").toLowerCase();
      if (!file) return { success: false, message: "\u9700\u8981\u6587\u4EF6\u8DEF\u5F84" };
      const supported = ["svg", "png", "pdf", "jpeg", "jpg", "xml", "html"];
      if (!supported.includes(format)) {
        return { success: false, message: `\u4E0D\u652F\u6301\u7684\u683C\u5F0F: ${format}\uFF0C\u652F\u6301: ${supported.join(", ")}` };
      }
      const xmlStr = fs.readFileSync(file, "utf8");
      const config = getConfig();
      const baseUrl = opts.url || config.url;
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
          signal: AbortSignal.timeout(6e4)
        });
        if (!res.ok) {
          let detail = "";
          try {
            detail = (await res.text()).slice(0, 200);
          } catch {
          }
          return exportFallback(
            opts,
            file,
            format,
            baseUrl,
            `\u5BFC\u51FA\u670D\u52A1\u8FD4\u56DE HTTP ${res.status}${detail ? `\uFF08${detail}\uFF09` : "\uFF08\u670D\u52A1\u7AEF\u53EF\u80FD\u672A\u542F\u7528\u5BFC\u51FA\u540E\u7AEF\uFF09"}`
          );
        }
        const ext = format === "jpeg" ? "jpg" : format;
        const outFile = opts.output || file.replace(/\.(drawio|xml)$/, `.${ext}`);
        if (["svg", "xml", "html"].includes(format)) {
          const text = await res.text();
          if (format === "svg" && !text.trim().startsWith("<")) {
            return exportFallback(opts, file, format, baseUrl, "\u5BFC\u51FA\u670D\u52A1\u8FD4\u56DE\u975E SVG \u5185\u5BB9");
          }
          fs.writeFileSync(outFile, text, "utf8");
        } else {
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(outFile, buf);
        }
        return {
          success: true,
          file: path.resolve(outFile),
          format,
          message: `\u5DF2\u5BFC\u51FA\u4E3A ${format}: ${outFile}`
        };
      } catch (e) {
        const reason = e.name === "TimeoutError" || e.name === "AbortError" ? "\u5BFC\u51FA\u8D85\u65F6\uFF0860s\uFF09" : e.message;
        return exportFallback(opts, file, format, baseUrl, reason);
      }
    }
    function exportFallback(opts, file, format, baseUrl, reason) {
      return {
        success: false,
        error: "\u5BFC\u51FA\u5931\u8D25",
        format,
        reason,
        message: `\u65E0\u6CD5\u901A\u8FC7\u670D\u52A1\u7AEF\u5BFC\u51FA\uFF08${reason}\uFF09\u3002\u53EF\u6539\u7528\uFF1A
1. \u751F\u6210\u7F16\u8F91 URL \u540E\u5728\u6D4F\u89C8\u5668\u4E2D\u5BFC\u51FA: node skill.js edit ${file}
2. \u786E\u8BA4 draw.io \u90E8\u7F72\u5DF2\u542F\u7528\u5BFC\u51FA\u540E\u7AEF\uFF08ExportServlet / DRAWIO_SERVER_URL \u6307\u5411 export-server\uFF09`,
        tip: "draw.io \u6807\u51C6\u524D\u7AEF\u90E8\u7F72\u9ED8\u8BA4\u4E0D\u542B REST \u5BFC\u51FA API\uFF0C\u9700\u72EC\u7ACB\u90E8\u7F72 export-server \u624D\u652F\u6301\u547D\u4EE4\u884C\u5BFC\u51FA\u3002"
      };
    }
    async function cmdEdit2(opts, positional) {
      const file = positional[0];
      if (!file) return { success: false, message: "\u9700\u8981\u6587\u4EF6\u8DEF\u5F84" };
      const xmlStr = fs.readFileSync(file, "utf8");
      const config = getConfig();
      const baseUrl = opts.url || config.url;
      return {
        success: true,
        file: path.resolve(file),
        editUrl: `${baseUrl}/#R${encodeURIComponent(xmlStr)}`,
        message: `\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u6B64 URL \u7F16\u8F91\u56FE\u8868`
      };
    }
    async function cmdView2(opts, positional) {
      const file = positional[0];
      if (!file) return { success: false, message: "\u9700\u8981\u6587\u4EF6\u8DEF\u5F84" };
      const xmlStr = fs.readFileSync(file, "utf8");
      const config = getConfig();
      const baseUrl = opts.url || config.url;
      return {
        success: true,
        file: path.resolve(file),
        viewUrl: `${baseUrl}/?lightbox=1#R${encodeURIComponent(xmlStr)}`,
        message: `\u5728\u6D4F\u89C8\u5668\u4E2D\u6253\u5F00\u6B64 URL \u67E5\u770B\u56FE\u8868\uFF08\u53EA\u8BFB\uFF09`
      };
    }
    async function cmdShapes2(opts) {
      const names = listShapes();
      const query = opts.query || opts.filter || null;
      let filtered = names;
      if (query) {
        const q = query.toLowerCase();
        filtered = names.filter((n) => n.toLowerCase().includes(q));
      }
      return {
        success: true,
        count: filtered.length,
        shapes: filtered,
        colors: Object.keys(COLORS)
      };
    }
    function cmdConfig2() {
      const config = getConfig();
      return {
        success: true,
        url: config.url,
        rejectUnauthorized: config.rejectUnauthorized
      };
    }
    function cmdHelp2() {
      return {
        success: true,
        message: "\u4F7F\u7528 --help \u67E5\u770B\u5B8C\u6574\u5E2E\u52A9"
      };
    }
    function buildEditUrl(opts, xml) {
      const config = getConfig();
      const baseUrl = (opts.url || config.url).replace(/\/+$/, "");
      return xml ? `${baseUrl}/#R${encodeURIComponent(xml)}` : baseUrl;
    }
    function createFlowchartTemplate(doc) {
      const s = addVertex(doc, { value: "\u5F00\u59CB", style: getStyle("startEnd"), x: 200, y: 20, width: 100, height: 40 });
      const p1 = addVertex(doc, { value: "\u5904\u7406", style: getStyle("process"), x: 200, y: 100, width: 100, height: 60 });
      const d = addVertex(doc, { value: "\u5224\u65AD?", style: getStyle("decision"), x: 190, y: 200, width: 120, height: 80 });
      const p2 = addVertex(doc, { value: "\u5904\u7406A", style: getStyle("process"), x: 80, y: 330, width: 100, height: 60 });
      const p3 = addVertex(doc, { value: "\u5904\u7406B", style: getStyle("process"), x: 320, y: 330, width: 100, height: 60 });
      const e = addVertex(doc, { value: "\u7ED3\u675F", style: getStyle("startEnd"), x: 200, y: 440, width: 100, height: 40 });
      addEdge(doc, { source: s, target: p1 });
      addEdge(doc, { source: p1, target: d });
      addEdge(doc, { source: d, target: p2, value: "\u662F" });
      addEdge(doc, { source: d, target: p3, value: "\u5426" });
      addEdge(doc, { source: p2, target: e });
      addEdge(doc, { source: p3, target: e });
    }
    function createSequenceTemplate(doc) {
      const lane1 = addContainer(doc, { value: "\u7528\u6237", x: 20, y: 20, width: 200, height: 400 });
      const lane2 = addContainer(doc, { value: "\u7CFB\u7EDF", x: 260, y: 20, width: 200, height: 400 });
      const lane3 = addContainer(doc, { value: "\u6570\u636E\u5E93", x: 500, y: 20, width: 200, height: 400 });
      const u1 = addVertex(doc, { value: "\u7528\u6237", style: getStyle("actor"), x: 80, y: 60, width: 40, height: 60, parent: lane1 });
      const s1 = addVertex(doc, { value: "\u7CFB\u7EDF", style: getStyle("rect"), x: 310, y: 60, width: 80, height: 40, parent: lane2 });
      const d1 = addVertex(doc, { value: "\u6570\u636E\u5E93", style: getStyle("database"), x: 550, y: 60, width: 60, height: 60, parent: lane3 });
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
    module2.exports = {
      cmdStatus: cmdStatus2,
      cmdNew: cmdNew2,
      cmdAdd: cmdAdd2,
      cmdConnect: cmdConnect2,
      cmdBatch: cmdBatch2,
      cmdExport: cmdExport2,
      cmdEdit: cmdEdit2,
      cmdView: cmdView2,
      cmdShapes: cmdShapes2,
      cmdConfig: cmdConfig2,
      cmdHelp: cmdHelp2
    };
  }
});

// run.js
var { loadDotEnv, initTls } = require_api();
var SKILL_VERSION = true ? "260726.162630" : "1.0.0-dev";
var {
  cmdStatus,
  cmdNew,
  cmdAdd,
  cmdConnect,
  cmdBatch,
  cmdExport,
  cmdEdit,
  cmdView,
  cmdShapes,
  cmdConfig,
  cmdHelp
} = require_commands();
var { cmdLive } = require_live();
loadDotEnv(__dirname);
initTls();
function parseOptions(args, startIndex) {
  const opts = {};
  const positional = [];
  let i = startIndex;
  while (i < args.length) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        opts[key] = args[i + 1];
        i += 2;
      } else {
        opts[key] = true;
        i++;
      }
    } else {
      positional.push(args[i]);
      i++;
    }
  }
  return { opts, positional };
}
function showHelp() {
  console.log(`
\u79C1\u6709\u5316 draw.io \u8FDC\u7A0B\u64CD\u4F5C\u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [args] [options]

\u57FA\u7840\u547D\u4EE4:
  status                              \u68C0\u67E5 draw.io \u670D\u52A1\u8FDE\u63A5\u72B6\u6001
  new <name>                          \u521B\u5EFA\u65B0\u56FE\u8868\u6587\u4EF6
  add <file> <label>                  \u6DFB\u52A0\u8282\u70B9
  connect <file> <sourceId> <targetId>  \u8FDE\u63A5\u4E24\u4E2A\u8282\u70B9
  batch <file> <data.json>            \u6279\u91CF\u521B\u5EFA\u8282\u70B9\u548C\u8FDE\u63A5
  export <file> [format]              \u5BFC\u51FA\u4E3A SVG/PNG/PDF
  edit <file>                         \u751F\u6210\u5728\u7EBF\u7F16\u8F91 URL
  view <file>                         \u751F\u6210\u53EA\u8BFB\u67E5\u770B URL
  shapes [--query <keyword>]          \u5217\u51FA\u53EF\u7528\u5F62\u72B6\u6837\u5F0F
  config                              \u663E\u793A\u5F53\u524D\u914D\u7F6E
  live [file] [--port N] [--no-open]  \u542F\u52A8\u672C\u5730\u5B9E\u65F6\u9884\u89C8\uFF08\u6D4F\u89C8\u5668\u5B9E\u65F6\u5237\u65B0\uFF09

\u5168\u5C40\u9009\u9879:
  --url <url>       \u8986\u76D6 draw.io \u670D\u52A1\u5668\u5730\u5740
  --output <file>   \u6307\u5B9A\u8F93\u51FA\u6587\u4EF6\u8DEF\u5F84
  --shape <name>    \u8282\u70B9\u5F62\u72B6 (add \u547D\u4EE4\uFF0C\u9ED8\u8BA4 roundedRect)
  --color <name>    \u8282\u70B9\u989C\u8272 (blue/green/orange/red/purple/gray)
  --style <str>     \u81EA\u5B9A\u4E49\u6837\u5F0F\u5B57\u7B26\u4E32
  --x <n>           \u8282\u70B9 X \u5750\u6807
  --y <n>           \u8282\u70B9 Y \u5750\u6807
  --width <n>       \u8282\u70B9\u5BBD\u5EA6
  --height <n>      \u8282\u70B9\u9AD8\u5EA6
  --label <text>    \u8FDE\u63A5\u7EBF\u6807\u7B7E (connect \u547D\u4EE4)
  --template <name> \u65B0\u5EFA\u6A21\u677F: flowchart / sequence / architecture (new \u547D\u4EE4)
  --query <keyword> \u641C\u7D22\u5F62\u72B6 (shapes \u547D\u4EE4)
  --port <n>        live \u9884\u89C8\u670D\u52A1\u7AEF\u53E3 (\u9ED8\u8BA4 17777)
  --no-open         live \u4E0D\u81EA\u52A8\u6253\u5F00\u6D4F\u89C8\u5668
  -h, --help        \u663E\u793A\u5E2E\u52A9
  -v, --version     \u663E\u793A\u7248\u672C

\u73AF\u5883\u53D8\u91CF:
  DRAWIO_URL                  draw.io \u670D\u52A1\u5730\u5740 (\u9ED8\u8BA4 http://localhost:8080)
  DRAWIO_REJECT_UNAUTHORIZED  HTTPS \u8BC1\u4E66\u9A8C\u8BC1 (\u9ED8\u8BA4 false)

\u793A\u4F8B:
  # \u68C0\u67E5\u670D\u52A1\u72B6\u6001
  node skill.js status

  # \u521B\u5EFA\u6D41\u7A0B\u56FE\u6A21\u677F
  node skill.js new myflow --template flowchart

  # \u6DFB\u52A0\u8282\u70B9
  node skill.js add myflow.drawio "\u7528\u6237\u8BF7\u6C42" --shape roundedRect --color blue --x 200 --y 100

  # \u8FDE\u63A5\u8282\u70B9
  node skill.js connect myflow.drawio 1 2 --label "\u8BF7\u6C42"

  # \u6279\u91CF\u521B\u5EFA\uFF08\u4ECE JSON \u6587\u4EF6\uFF09
  node skill.js batch myflow.drawio data.json

  # \u751F\u6210\u5728\u7EBF\u7F16\u8F91 URL
  node skill.js edit myflow.drawio

  # \u5217\u51FA\u5F62\u72B6
  node skill.js shapes --query flow

  # \u67E5\u770B\u989C\u8272
  node skill.js shapes --query color

  # \u5BFC\u51FA\u4E3A SVG
  node skill.js export myflow.drawio svg

  # \u5B9E\u65F6\u9884\u89C8\uFF08\u4E24\u4E2A\u7EC8\u7AEF\u914D\u5408\uFF09
  # \u7EC8\u7AEF1: node skill.js live myflow.drawio        # \u542F\u52A8\u9884\u89C8\u670D\u52A1\u5E76\u6253\u5F00\u6D4F\u89C8\u5668
  # \u7EC8\u7AEF2: node skill.js add myflow.drawio "\u65B0\u8282\u70B9"  # \u6D4F\u89C8\u5668\u5B9E\u65F6\u5237\u65B0
`);
}
var COMMANDS = {
  status: { handler: (opts) => cmdStatus(opts), args: [], req: [] },
  new: { handler: (opts, pos) => cmdNew(opts, pos), args: ["name"], req: ["\u56FE\u8868\u540D\u79F0"] },
  add: { handler: (opts, pos) => cmdAdd(opts, pos), args: ["file", "label"], req: ["\u6587\u4EF6\u8DEF\u5F84", "\u8282\u70B9\u6587\u672C"] },
  connect: { handler: (opts, pos) => cmdConnect(opts, pos), args: ["file", "source", "target"], req: ["\u6587\u4EF6\u8DEF\u5F84", "\u6E90\u8282\u70B9ID", "\u76EE\u6807\u8282\u70B9ID"] },
  batch: { handler: (opts, pos) => cmdBatch(opts, pos), args: ["file", "data"], req: ["\u6587\u4EF6\u8DEF\u5F84", "JSON\u6570\u636E\u6587\u4EF6"] },
  export: { handler: (opts, pos) => cmdExport(opts, pos), args: ["file"], req: ["\u6587\u4EF6\u8DEF\u5F84"] },
  edit: { handler: (opts, pos) => cmdEdit(opts, pos), args: ["file"], req: ["\u6587\u4EF6\u8DEF\u5F84"] },
  view: { handler: (opts, pos) => cmdView(opts, pos), args: ["file"], req: ["\u6587\u4EF6\u8DEF\u5F84"] },
  shapes: { handler: (opts) => cmdShapes(opts), args: [], req: [] },
  live: { handler: (opts, pos) => cmdLive(opts, pos), args: [], req: [] },
  config: { handler: () => cmdConfig(), args: [], req: [] },
  help: { handler: () => cmdHelp(), args: [], req: [] }
};
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    return;
  }
  if (args[0] === "-v" || args[0] === "--version") {
    console.log(`\u79C1\u6709\u5316 draw.io \u8FDC\u7A0B\u64CD\u4F5C\u5DE5\u5177 v${SKILL_VERSION}`);
    return;
  }
  const command = args[0];
  const { opts, positional } = parseOptions(args, 1);
  const cmd = COMMANDS[command];
  if (!cmd) {
    console.log(JSON.stringify({ error: "\u672A\u77E5\u547D\u4EE4", message: `\u4E0D\u652F\u6301\u547D\u4EE4: ${command}\uFF0C\u4F7F\u7528 --help \u67E5\u770B\u5E2E\u52A9` }, null, 2));
    return;
  }
  for (let i = 0; i < cmd.args.length; i++) {
    if (!positional[i]) {
      console.log(JSON.stringify({ error: "\u53C2\u6570\u9519\u8BEF", message: `${command} \u547D\u4EE4\u9700\u8981${cmd.req[i]}\u53C2\u6570` }, null, 2));
      return;
    }
  }
  const result = cmd.handler(opts, positional);
  console.log(JSON.stringify(await result, null, 2));
}
main().catch((err) => {
  console.error(JSON.stringify({ error: "\u7A0B\u5E8F\u9519\u8BEF", message: err.message }));
  process.exit(1);
});
