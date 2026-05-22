#!/usr/bin/env node
/**
 * DOCX 编辑工具 — 入口文件
 *
 * 用法: node skill.js <file> <command> [JSON-input] [options]
 */

const { DocxZip } = require("./lib/docx_zip");
const { dispatch, parseArgs, showHelp, SKILL_VERSION } = require("./lib/cli");

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  showHelp();
  process.exit(0);
}

if (args.version) {
  console.log(`DOCX 编辑工具 v${SKILL_VERSION}`);
  process.exit(0);
}

dispatch(args).catch((err) => {
  console.log(JSON.stringify({ ok: false, command: "unknown", error: err.message }, null, 2));
  process.exit(1);
});
