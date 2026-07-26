/**
 * draw.io 实时预览（live）
 *
 * 本地 SSE 服务 + 容器页（iframe 嵌入私有 drawio 的 embed 模式）。
 * 默认不启用：仅当显式运行 `live` 命令时启动服务；写入命令通过 notifyLive()
 * 推送最新 XML，服务未运行时连接被拒即时返回，静默跳过，零额外开销。
 *
 * 零依赖：Node 内置 http 提供服务端，浏览器原生 EventSource 接收推送。
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { getConfig } = require("./api");

const DEFAULT_PORT = parseInt(process.env.DRAWIO_LIVE_PORT, 10) || 17777;

/**
 * 容器页 HTML：iframe 嵌入 drawio（embed 模式），SSE 接收新 XML 并 postMessage 推送重绘。
 * drawio embed 协议：init 后父页面发 {action:"load", xml} 即时加载新图。
 */
function containerHtml(drawioUrl) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>draw.io 实时预览</title>
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
<div id="bar"><span class="dot" id="st"></span><span id="info">连接中…</span><span class="tip">draw.io live · Ctrl+C 停止</span></div>
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
    ready=true;st.classList.add('on');info.textContent='已连接 draw.io';
    fetch('/current').then(function(r){return r.json()}).then(function(d){if(d&&d.xml)post({action:'load',xml:d.xml,autosave:0})}).catch(function(){});
  }
});
var es=new EventSource('/sse');
es.addEventListener('xml',function(e){
  var d=JSON.parse(e.data);
  if(ready&&d.xml)post({action:'load',xml:d.xml,autosave:0});
  info.textContent=d.file?('已更新: '+d.file):'已更新';
});
es.onerror=function(){st.classList.remove('on');info.textContent='连接断开，重连中…'};
</script>
</body>
</html>`;
}

/**
 * 创建本地 HTTP 服务
 * 端点：
 *   GET  /          容器页（iframe 嵌入 drawio）
 *   GET  /sse       SSE 推送通道（浏览器 EventSource 连接）
 *   GET  /current   返回最新 XML（容器 init 后拉取）
 *   POST /update    写入命令推送新 XML，广播给所有 SSE 客户端
 */
function createServer({ drawioUrl, initialXml, initialFile }) {
  const clients = new Set();
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
        Connection: "keep-alive",
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
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const d = JSON.parse(body);
          latestXml = d.xml || latestXml;
          latestFile = d.file || latestFile;
          const payload =
            "event: xml\ndata: " +
            JSON.stringify({ xml: latestXml, file: latestFile }) +
            "\n\n";
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
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

/**
 * live 命令实现：启动本地服务并打开容器页，前台运行（Ctrl+C 退出）
 * 用法: live [file] [--port N] [--no-open]
 */
function cmdLive(opts, positional) {
  const config = getConfig();
  const drawioUrl = (opts.url || config.url).replace(/\/+$/, "");
  const port = parseInt(opts.port, 10) || DEFAULT_PORT;
  const file = positional[0];
  let initialXml = "";
  let initialFile = "";
  if (file) {
    if (!fs.existsSync(file)) {
      return { success: false, error: "文件不存在", message: `找不到文件: ${file}` };
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
        message: "draw.io live 预览服务已启动",
        containerUrl,
        drawioUrl,
        port,
        initialFile: initialFile || null,
        tip: "另开一个终端执行 add/connect/batch 等命令，浏览器将实时刷新。Ctrl+C 停止服务。",
      });
    });
    server.on("error", (e) => {
      resolve({
        success: false,
        error: e.code === "EADDRINUSE" ? "端口占用" : "启动失败",
        message:
          e.code === "EADDRINUSE"
            ? `端口 ${port} 已被占用，使用 --port 指定其他端口`
            : e.message,
      });
    });
    process.on("SIGINT", () => server.close(() => process.exit(0)));
    process.on("SIGTERM", () => server.close(() => process.exit(0)));
    server.listen(port, "127.0.0.1");
  });
}

/**
 * 写入命令推送：将最新 XML 发给本地 live 服务广播。
 * live 未运行时连接被拒即时返回，静默跳过，不影响主流程。
 */
async function notifyLive(file, xml) {
  const port = parseInt(process.env.DRAWIO_LIVE_PORT, 10) || DEFAULT_PORT;
  try {
    await fetch(`http://127.0.0.1:${port}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, xml }),
      signal: AbortSignal.timeout(1500),
    });
    return true;
  } catch {
    return false;
  }
}

module.exports = { cmdLive, notifyLive, DEFAULT_PORT };
