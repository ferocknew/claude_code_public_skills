#!/usr/bin/env node
/**
 * MS Office 编辑工具 — 入口文件
 *
 * 用法: node skill.js <file> <command> [JSON-input] [options]
 * 支持: .docx, .xlsx
 */

const { DocxZip } = require("./lib/docx_zip");
const { dispatch, parseArgs, showHelp, SKILL_VERSION } = require("./lib/cli");
const { xlsxDispatch, showXlsxHelp } = require("./lib/xlsx_cli");

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  showHelp();
  showXlsxHelp(SKILL_VERSION);
  process.exit(0);
}

if (args.version) {
  console.log(`MS Office 编辑工具 v${SKILL_VERSION}`);
  process.exit(0);
}

// 根据文件扩展名分流
const filePath = args._[0];
const ext = filePath.match(/\.(\w+)$/)?.[1]?.toLowerCase();

let dispatchFn;
if (ext === "xlsx") {
  dispatchFn = xlsxDispatch;
} else if (ext === "docx") {
  dispatchFn = dispatch;
} else {
  console.log(JSON.stringify({ ok: false, command: "none", error: `不支持的文件类型: .${ext || "未知"}，仅支持 .docx 和 .xlsx` }, null, 2));
  process.exit(1);
}

dispatchFn(args).catch((err) => {
  console.log(JSON.stringify({ ok: false, command: "unknown", error: err.message }, null, 2));
  process.exit(1);
});
