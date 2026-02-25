#!/usr/bin/env -S npx -y -p mammoth@1.6.0 -p turndown@7.1.2 node
/**
 * DOCX 文档读取工具
 *
 * 用法:
 *   node skill.js <文件绝对路径> [选项]
 *
 * 选项:
 *   --raw       只输出原始 Markdown，不添加任何格式
 *   --txt       输出纯文本格式（去除所有 Markdown 标记，最节省 Token）
 *   --html      输出 HTML 格式（而不是 Markdown）
 *
 * 作者: Claude Code
 * 版本: 1.0.0
 */

const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const TurndownService = require("turndown");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 解析命令行参数
const args = process.argv.slice(2);
const docxFile = args.find(arg => !arg.startsWith("--"));
const isRaw = args.includes("--raw");
const isTxt = args.includes("--txt");
const isHtml = args.includes("--html");

// 显示帮助
function showHelp() {
  console.log(`
DOCX 文档读取工具 v${SKILL_VERSION}

用法:
  node skill.js <文件绝对路径> [选项]

参数:
  文件绝对路径   DOCX 文件的绝对路径（必需）

选项:
  --raw         只输出原始 Markdown，不添加任何格式
  --txt         输出纯文本格式（去除所有 Markdown 标记，最节省 Token）
  --html        输出 HTML 格式（而不是 Markdown）

示例:
  # 读取文档并输出 Markdown（默认）
  node skill.js D:/data/document.docx

  # 只输出原始 Markdown
  node skill.js D:/data/document.docx --raw

  # 输出纯文本格式（去除所有 Markdown 标记）
  node skill.js D:/data/document.docx --txt

  # 输出 HTML 格式
  node skill.js D:/data/document.docx --html

快捷选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息
`);
}

// 显示版本
function showVersion() {
  console.log(`DOCX 文档读取工具 v${SKILL_VERSION}`);
  console.log("基于 Mammoth + Turndown");
}

if (!docxFile || docxFile === "-h" || docxFile === "--help") {
  showHelp();
  process.exit(0);
}

if (docxFile === "-v" || docxFile === "--version") {
  showVersion();
  process.exit(0);
}

// 检查文件是否存在
if (!fs.existsSync(docxFile)) {
  console.error(`错误: 文件不存在 - ${docxFile}`);
  process.exit(1);
}

// 检查文件扩展名
const ext = path.extname(docxFile).toLowerCase();
if (ext !== ".docx") {
  console.error(`错误: 不支持的文件格式 - ${ext}`);
  console.error("本工具仅支持 .docx 格式");
  process.exit(1);
}

// 主函数
async function main() {
  try {
    if (!isRaw) {
      console.log("\n" + "=".repeat(70));
      console.log("📄 DOCX 文档读取");
      console.log("=".repeat(70));
      console.log(`\n文件: ${docxFile}\n`);
    }

    // 读取 DOCX 文件
    const result = await mammoth.convertToHtml({ path: docxFile });

    if (isHtml) {
      // 直接输出 HTML
      if (isRaw) {
        console.log(result.value);
      } else {
        console.log("─".repeat(70));
        console.log("HTML 内容:");
        console.log("─".repeat(70) + "\n");
        console.log(result.value);
        console.log("\n" + "=".repeat(70));
      }
    } else if (isTxt) {
      // 转换为纯文本（去除所有 Markdown 标记）
      const turndownService = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced"
      });
      turndownService.keep(["table", "tr", "td", "th", "tbody", "thead"]);
      const markdown = turndownService.turndown(result.value);

      // 去除所有 Markdown 标记
      const plainText = markdown
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*|__/g, '')
        .replace(/(?<!\*)\*(?!\*)|(?<!_)_(?!_)/g, '')
        .replace(/^```[\s\S]*?^```/gm, '')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/^[-*]{3,}\s*$/gm, '')
        .replace(/^\>\s*/gm, '')
        .replace(/^[-*]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+$/gm, '')
        .trim();

      if (isRaw) {
        console.log(plainText);
      } else {
        console.log("─".repeat(70));
        console.log("纯文本内容（已去除所有 Markdown 标记）:");
        console.log("─".repeat(70) + "\n");
        console.log(plainText);
        console.log("\n" + "=".repeat(70));
        console.log("\n✅ 转换完成！已输出去除 Markdown 标记的纯文本。");
        console.log("=".repeat(70) + "\n");
      }
    } else {
      // 转换为 Markdown
      const turndownService = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced"
      });

      // 自定义规则：处理表格
      turndownService.keep(["table", "tr", "td", "th", "tbody", "thead"]);

      const markdown = turndownService.turndown(result.value);

      if (isRaw) {
        console.log(markdown);
      } else {
        console.log("─".repeat(70));
        console.log("Markdown 内容:");
        console.log("─".repeat(70) + "\n");
        console.log(markdown);
        console.log("\n" + "=".repeat(70));

        // 显示文档元数据
        if (result.messages && result.messages.length > 0) {
          console.log("\n⚠️  转换提示:");
          result.messages.forEach(msg => {
            console.log(`  - ${msg.message}`);
          });
        }

        console.log("\n✅ 转换完成！");
        console.log("=".repeat(70) + "\n");
      }
    }

  } catch (error) {
    console.error(`\n❌ 错误: ${error.message}`);

    if (error.code === "ENOENT") {
      console.error("文件未找到，请检查路径是否正确");
    } else if (error.message.includes("zip")) {
      console.error("文件可能不是有效的 DOCX 格式（DOCX 实际上是 ZIP 压缩包）");
    }

    process.exit(1);
  }
}

main();
