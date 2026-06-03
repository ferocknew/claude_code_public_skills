/**
 * CLI 解析与命令分发
 */

const { DocxZip } = require("./docx_zip");
const { XmlTextOps, XmlTableOps, ImageOps, HeaderFooterOps, MetaOps, StyleOps } = require("./ops");

const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "dev";

// ─── CLI 参数解析 ────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [] };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "-o" || a === "--output") { args.output = argv[++i]; }
    else if (a === "-i" || a === "--image") { args.image = argv[++i]; }
    else if (a === "--regex") { args.regex = true; }
    else if (a === "--summary") { args.summary = true; }
    else if (a === "--dry-run") { args.dryRun = true; }
    else if (a === "-h" || a === "--help") { args.help = true; }
    else if (a === "-v" || a === "--version") { args.version = true; }
    else { args._.push(a); }
    i++;
  }
  return args;
}

// ─── 输出工具 ───────────────────────────────────────────────────

function output(ok, command, data) {
  console.log(JSON.stringify({ ok, command, data }, null, 2));
}

function outputError(command, message) {
  console.log(JSON.stringify({ ok: false, command, error: message }, null, 2));
  process.exit(1);
}

// ─── 帮助信息 ───────────────────────────────────────────────────

function showHelp() {
  console.log(`
DOCX 编辑工具 v${SKILL_VERSION}

用法: node skill.js <file> <command> [JSON-input] [options]

只读命令:
  info                              文档结构概览
  text-read                         读取全部文本
  text-find <query>                 搜索文本
  table-list                        列出所有表格
  table-read <index>                读取指定表格
  image-list                        列出所有图片
  image-extract <name>              导出图片
  header-read [index]               读取页眉
  footer-read [index]               读取页脚
  meta-read                         读取文档属性

对比命令:
  diff <new.docx>                   比较两文档差异（Markdown 报告）
  diff <new.docx> --summary         仅输出差异概要统计

写入命令:
  text-replace '<json>'             文本替换
  table-update <index> '<json>'     修改表格单元格
  image-replace <name> -i <path>    替换图片
  header-replace <index> '<json>'   替换页眉文本
  footer-replace <index> '<json>'   替换页脚文本
  meta-update '<json>'              修改文档属性

选项:
  -o, --output <path>               输出路径（默认覆盖原文件）
  -i, --image <path>                新图片路径
  --regex                           正则搜索模式
  --dry-run                         预览修改，不实际执行
  --summary                         仅输出差异概要（diff 命令）

示例:
  node skill.js doc.docx info
  node skill.js doc.docx text-find "关键词"
  node skill.js doc.docx text-replace '{"find":"旧","replace":"新"}'
  node skill.js doc.docx table-read 0
  node skill.js doc.docx table-update 0 '{"row":0,"col":1,"text":"新值"}'
  node skill.js doc.docx image-list
  node skill.js doc.docx image-replace image1.png -i new.png
  node skill.js doc.docx meta-update '{"dc:title":"新标题"}'

对比示例:
  node skill.js old.docx diff new.docx
  node skill.js old.docx diff new.docx --summary
  node skill.js old.docx diff new.docx -o report.md

样式命令:
  style-read <query>                 查看文本样式
  style-apply '<json>'               修改文本样式

样式参数:
  bold: true/false                   粗体
  italic: true/false                 斜体
  underline: "single"/"none"         下划线
  strikethrough: true/false          删除线
  fontSize: 24                       字号（半磅值，24=12pt）
  fontFamily: "Arial"                字体
  color: "FF0000"                    字体颜色
  highlight: "yellow"                高亮颜色

示例:
  node skill.js doc.docx style-read "标题"
  node skill.js doc.docx style-apply '{"find":"焊接","bold":true,"color":"FF0000"}'
  node skill.js doc.docx style-apply '{"find":"标题","fontSize":32,"fontFamily":"黑体"}'
`);
}

// ─── 命令分发 ───────────────────────────────────────────────────

async function dispatch(args) {
  const filePath = args._[0];
  const command = args._[1];
  const p2 = args._[2]; // 第三个位置参数（query / index / json）
  const p3 = args._[3]; // 第四个位置参数（json for table-update）

  if (!filePath) outputError("none", "请指定 docx 文件路径");
  if (!command) outputError("none", "请指定命令。运行 node skill.js --help 查看帮助");

  const fs = require("fs");
  if (!fs.existsSync(filePath)) outputError(command, `文件不存在: ${filePath}`);

  // diff 命令不走常规 docx 加载流程
  if (command === "diff") return cmdDiff(filePath, p2, command, args);

  const docx = await DocxZip.fromFile(filePath);
  const outputPath = args.output || filePath;

  switch (command) {
    case "info": return cmdInfo(docx, command);
    case "text-read": return cmdTextRead(docx, command);
    case "text-find": return cmdTextFind(docx, command, p2, args);
    case "text-replace": return cmdTextReplace(docx, command, p2, outputPath, args);
    case "table-list": return cmdTableList(docx, command);
    case "table-read": return cmdTableRead(docx, command, p2);
    case "table-update": return cmdTableUpdate(docx, command, p2, p3, outputPath, args);
    case "image-list": return cmdImageList(docx, command);
    case "image-extract": return cmdImageExtract(docx, command, p2);
    case "image-replace": return cmdImageReplace(docx, command, p2, outputPath, args);
    case "header-read": return cmdHeaderRead(docx, command, p2);
    case "footer-read": return cmdFooterRead(docx, command, p2);
    case "header-replace": return cmdHeaderReplace(docx, command, p2, p3, outputPath, args);
    case "footer-replace": return cmdFooterReplace(docx, command, p2, p3, outputPath, args);
    case "meta-read": return cmdMetaRead(docx, command);
    case "meta-update": return cmdMetaUpdate(docx, command, p2, outputPath, args);
    case "style-read": return cmdStyleRead(docx, command, p2);
    case "style-apply": return cmdStyleApply(docx, command, p2, outputPath, args);
    default: outputError(command, `未知命令: ${command}`);
  }
}

// ─── 命令实现 ───────────────────────────────────────────────────

async function getDocumentXml(docx, command) {
  const xml = await docx.readXml("word/document.xml");
  if (!xml) outputError(command, "无法读取 word/document.xml");
  return xml;
}

function parseJson(str, command) {
  try { return JSON.parse(str); }
  catch (e) { outputError(command, `JSON 解析失败: ${e.message}`); }
}

async function cmdInfo(docx, command) {
  const documentXml = await getDocumentXml(docx, command);
  const { extractAllXmlBlocks, extractParagraphText } = require("./xml_utils");

  const paragraphs = extractAllXmlBlocks(documentXml, "w:p");
  const tables = extractAllXmlBlocks(documentXml, "w:tbl");
  const images = ImageOps.listImages(docx);
  const { headers, footers } = HeaderFooterOps.getHeaderFooterFiles(docx);

  let meta = {};
  const coreXml = await docx.readXml("docProps/core.xml");
  if (coreXml) meta = MetaOps.read(coreXml);

  let charCount = 0;
  for (const p of paragraphs) charCount += extractParagraphText(p.xml).length;

  output(true, command, {
    paragraphs: paragraphs.length, tables: tables.length,
    images: images.length, headers: headers.length, footers: footers.length,
    charCount, meta, imageFiles: images,
  });
}

async function cmdTextRead(docx, command) {
  const documentXml = await getDocumentXml(docx, command);
  const result = XmlTextOps.readAllText(documentXml);
  output(true, command, { total: result.length, paragraphs: result.filter((p) => p.text.length > 0) });
}

async function cmdTextFind(docx, command, query, args) {
  if (!query) outputError(command, "请指定搜索关键词");
  const documentXml = await getDocumentXml(docx, command);
  const results = XmlTextOps.findText(documentXml, query, args.regex);
  output(true, command, { query, useRegex: !!args.regex, matches: results.length, results });
}

async function cmdTextReplace(docx, command, jsonStr, outputPath, args) {
  if (!jsonStr) outputError(command, '请指定替换参数，格式: \'{"find":"旧","replace":"新"}\' ');
  const params = parseJson(jsonStr, command);
  if (!params.find || params.replace === undefined) outputError(command, "需要 find 和 replace 字段");

  const documentXml = await getDocumentXml(docx, command);
  const result = XmlTextOps.replaceText(documentXml, params.find, params.replace, args.dryRun, args.regex);

  if (!args.dryRun && result.replacements > 0) {
    await docx.writeXml("word/document.xml", result.xml);
    await docx.save(outputPath);
  }
  output(true, command, { find: params.find, replace: params.replace, replacements: result.replacements, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdTableList(docx, command) {
  const documentXml = await getDocumentXml(docx, command);
  const tables = XmlTableOps.listTables(documentXml);
  output(true, command, { total: tables.length, tables });
}

async function cmdTableRead(docx, command, indexStr) {
  if (indexStr === undefined) outputError(command, "请指定表格索引（从 0 开始）");
  const idx = parseInt(indexStr, 10);
  if (isNaN(idx)) outputError(command, "表格索引必须是数字");

  const documentXml = await getDocumentXml(docx, command);
  const data = XmlTableOps.readTable(documentXml, idx);
  if (!data) outputError(command, `表格索引 ${idx} 不存在`);
  output(true, command, { tableIndex: idx, rows: data.length, data });
}

async function cmdTableUpdate(docx, command, indexStr, jsonStr, outputPath, args) {
  if (indexStr === undefined) outputError(command, "请指定表格索引");
  const tableIndex = parseInt(indexStr, 10);
  if (isNaN(tableIndex)) outputError(command, "表格索引必须是数字");
  if (!jsonStr) outputError(command, '请指定修改参数，格式: \'{"row":0,"col":1,"text":"新值"}\' ');

  const params = parseJson(jsonStr, command);
  if (params.row === undefined || params.col === undefined || params.text === undefined)
    outputError(command, "需要 row, col, text 字段");

  const documentXml = await getDocumentXml(docx, command);
  const result = XmlTableOps.updateTableCell(documentXml, tableIndex, params.row, params.col, params.text, args.dryRun);

  if (!args.dryRun && result.updated) {
    await docx.writeXml("word/document.xml", result.xml);
    await docx.save(outputPath);
  }
  output(true, command, { tableIndex, row: params.row, col: params.col, text: params.text, updated: result.updated, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdImageList(docx, command) {
  output(true, command, { total: ImageOps.listImages(docx).length, images: ImageOps.listImages(docx) });
}

async function cmdImageExtract(docx, command, imageName) {
  if (!imageName) outputError(command, "请指定图片名称");
  const outPath = await ImageOps.extractImage(docx, imageName, process.cwd());
  if (!outPath) outputError(command, `图片不存在: ${imageName}`);
  output(true, command, { name: imageName, extractedTo: outPath });
}

async function cmdImageReplace(docx, command, imageName, outputPath, args) {
  if (!imageName) outputError(command, "请指定要替换的图片名称");
  if (!args.image) outputError(command, "请用 -i 指定新图片路径");

  const fs = require("fs");
  if (!fs.existsSync(args.image)) outputError(command, `新图片文件不存在: ${args.image}`);

  const replaced = await ImageOps.replaceImage(docx, imageName, args.image);
  if (!replaced) outputError(command, `图片不存在: ${imageName}`);

  if (!args.dryRun) await docx.save(outputPath);
  output(true, command, { name: imageName, replacedWith: args.image, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdHeaderRead(docx, command, indexStr) {
  const { headers } = HeaderFooterOps.getHeaderFooterFiles(docx);
  if (headers.length === 0) { output(true, command, { total: 0, headers: [] }); return; }

  const index = indexStr !== undefined ? parseInt(indexStr, 10) : -1;
  if (index >= 0) {
    if (index >= headers.length) outputError(command, `页眉索引 ${index} 不存在`);
    const xml = await docx.readXml(headers[index]);
    output(true, command, { file: headers[index], text: HeaderFooterOps.readText(xml) });
  } else {
    const result = [];
    for (const h of headers) {
      const xml = await docx.readXml(h);
      result.push({ file: h, text: HeaderFooterOps.readText(xml) });
    }
    output(true, command, { total: result.length, headers: result });
  }
}

async function cmdFooterRead(docx, command, indexStr) {
  const { footers } = HeaderFooterOps.getHeaderFooterFiles(docx);
  if (footers.length === 0) { output(true, command, { total: 0, footers: [] }); return; }

  const index = indexStr !== undefined ? parseInt(indexStr, 10) : -1;
  if (index >= 0) {
    if (index >= footers.length) outputError(command, `页脚索引 ${index} 不存在`);
    const xml = await docx.readXml(footers[index]);
    output(true, command, { file: footers[index], text: HeaderFooterOps.readText(xml) });
  } else {
    const result = [];
    for (const f of footers) {
      const xml = await docx.readXml(f);
      result.push({ file: f, text: HeaderFooterOps.readText(xml) });
    }
    output(true, command, { total: result.length, footers: result });
  }
}

async function cmdHeaderReplace(docx, command, indexStr, jsonStr, outputPath, args) {
  if (indexStr === undefined) outputError(command, "请指定页眉索引");
  const index = parseInt(indexStr, 10);
  if (!jsonStr) outputError(command, "请指定替换参数");

  const params = parseJson(jsonStr, command);
  const { headers } = HeaderFooterOps.getHeaderFooterFiles(docx);
  if (index >= headers.length) outputError(command, `页眉索引 ${index} 不存在`);

  const xml = await docx.readXml(headers[index]);
  const result = HeaderFooterOps.replaceText(xml, params.find, params.replace, args.dryRun);

  if (!args.dryRun && result.replacements > 0) {
    await docx.writeXml(headers[index], result.xml);
    await docx.save(outputPath);
  }
  output(true, command, { file: headers[index], replacements: result.replacements, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdFooterReplace(docx, command, indexStr, jsonStr, outputPath, args) {
  if (indexStr === undefined) outputError(command, "请指定页脚索引");
  const index = parseInt(indexStr, 10);
  if (!jsonStr) outputError(command, "请指定替换参数");

  const params = parseJson(jsonStr, command);
  const { footers } = HeaderFooterOps.getHeaderFooterFiles(docx);
  if (index >= footers.length) outputError(command, `页脚索引 ${index} 不存在`);

  const xml = await docx.readXml(footers[index]);
  const result = HeaderFooterOps.replaceText(xml, params.find, params.replace, args.dryRun);

  if (!args.dryRun && result.replacements > 0) {
    await docx.writeXml(footers[index], result.xml);
    await docx.save(outputPath);
  }
  output(true, command, { file: footers[index], replacements: result.replacements, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdMetaRead(docx, command) {
  const coreXml = await docx.readXml("docProps/core.xml");
  if (!coreXml) outputError(command, "无法读取 docProps/core.xml");

  const meta = MetaOps.read(coreXml);
  const appXml = await docx.readXml("docProps/app.xml");
  const appMeta = appXml ? MetaOps.readApp(appXml) : {};

  output(true, command, { core: meta, app: appMeta });
}

async function cmdMetaUpdate(docx, command, jsonStr, outputPath, args) {
  if (!jsonStr) outputError(command, '请指定修改参数，格式: \'{"dc:title":"新标题"}\' ');
  const updates = parseJson(jsonStr, command);

  const coreXml = await docx.readXml("docProps/core.xml");
  if (!coreXml) outputError(command, "无法读取 docProps/core.xml");

  const result = MetaOps.update(coreXml, updates, args.dryRun);
  if (!args.dryRun && Object.keys(result.updated).length > 0) {
    await docx.writeXml("docProps/core.xml", result.xml);
    await docx.save(outputPath);
  }
  output(true, command, { updated: result.updated, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

async function cmdStyleRead(docx, command, query) {
  if (!query) outputError(command, "请指定要查询样式的文本关键词");
  const documentXml = await getDocumentXml(docx, command);
  const styles = StyleOps.readStyle(documentXml, query);
  output(true, command, { query, matches: styles.length, styles });
}

async function cmdStyleApply(docx, command, jsonStr, outputPath, args) {
  if (!jsonStr) outputError(command, '请指定样式参数，格式: \'{"find":"文本","bold":true,"color":"FF0000"}\' ');
  const params = parseJson(jsonStr, command);
  if (!params.find) outputError(command, "需要 find 字段指定要修改样式的文本");

  // 分离 find 和样式参数
  const { find, ...styleChanges } = params;
  if (Object.keys(styleChanges).length === 0) outputError(command, "需要至少一个样式属性");

  const documentXml = await getDocumentXml(docx, command);
  const result = StyleOps.applyStyle(documentXml, find, styleChanges, args.dryRun);

  if (!args.dryRun && result.count > 0) {
    await docx.writeXml("word/document.xml", result.xml);
    await docx.save(outputPath);
  }

  output(true, command, { find, styleChanges, count: result.count, dryRun: !!args.dryRun, outputPath: args.dryRun ? null : outputPath });
}

// ─── Diff 命令 ──────────────────────────────────────────────────

async function cmdDiff(oldPath, newPath, command, args) {
  if (!newPath) outputError(command, "请指定新文档路径，格式: node skill.js old.docx diff new.docx");

  const fs = require("fs");
  if (!fs.existsSync(newPath)) outputError(command, `新文档不存在: ${newPath}`);

  const { DiffOps } = require("./diff_ops");
  const { DiffMd } = require("./diff_md");

  const oldDocx = await DocxZip.fromFile(oldPath);
  const newDocx = await DocxZip.fromFile(newPath);

  const result = await DiffOps.fullDiff(oldDocx, newDocx);

  const md = args.summary
    ? DiffMd.formatSummary(result, oldPath, newPath)
    : DiffMd.formatReport(result, oldPath, newPath);

  const path = require("path");
  let outputPath;
  if (args.output) {
    outputPath = path.resolve(args.output);
  } else {
    const oldDir = path.dirname(path.resolve(oldPath));
    const oldBase = path.basename(oldPath, path.extname(oldPath));
    const newBase = path.basename(newPath, path.extname(newPath));
    outputPath = path.join(oldDir, `diff_${oldBase}_vs_${newBase}.md`);
  }

  fs.writeFileSync(outputPath, md, "utf-8");
  console.log(`差异报告已写入: ${outputPath}`);
}

module.exports = { dispatch, parseArgs, showHelp, SKILL_VERSION };
