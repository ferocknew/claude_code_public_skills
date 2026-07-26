#!/usr/bin/env node
/**
 * 私有化 draw.io 远程操作工具
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   status                    检查 draw.io 服务连接状态
 *   new <name>                创建新图表文件
 *   add <file> <label>        添加节点
 *   connect <file> <src> <tgt>  连接节点
 *   batch <file> <data.json>  批量操作（从 JSON 读取节点和连接）
 *   export <file> [format]    导出图表（SVG/PNG/PDF）
 *   edit <file>               生成编辑 URL
 *   view <file>               生成只读查看 URL
 *   shapes                    列出可用形状
 *   config                    显示当前配置
 */

const { loadDotEnv, initTls } = require("./lib/api");
// 版本号：打包时 build.js 通过 __VERSION 注入时间戳，开发运行 run.js 时用 dev 标记
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";
const {
  cmdStatus, cmdNew, cmdAdd, cmdConnect, cmdBatch,
  cmdExport, cmdEdit, cmdView, cmdShapes, cmdConfig, cmdHelp,
} = require("./lib/commands");

loadDotEnv(__dirname);
initTls();

// ===================== CLI 解析 =====================

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
私有化 draw.io 远程操作工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [args] [options]

基础命令:
  status                              检查 draw.io 服务连接状态
  new <name>                          创建新图表文件
  add <file> <label>                  添加节点
  connect <file> <sourceId> <targetId>  连接两个节点
  batch <file> <data.json>            批量创建节点和连接
  export <file> [format]              导出为 SVG/PNG/PDF
  edit <file>                         生成在线编辑 URL
  view <file>                         生成只读查看 URL
  shapes [--query <keyword>]          列出可用形状样式
  config                              显示当前配置

全局选项:
  --url <url>       覆盖 draw.io 服务器地址
  --output <file>   指定输出文件路径
  --shape <name>    节点形状 (add 命令，默认 roundedRect)
  --color <name>    节点颜色 (blue/green/orange/red/purple/gray)
  --style <str>     自定义样式字符串
  --x <n>           节点 X 坐标
  --y <n>           节点 Y 坐标
  --width <n>       节点宽度
  --height <n>      节点高度
  --label <text>    连接线标签 (connect 命令)
  --template <name> 新建模板: flowchart / sequence / architecture (new 命令)
  --query <keyword> 搜索形状 (shapes 命令)
  -h, --help        显示帮助
  -v, --version     显示版本

环境变量:
  DRAWIO_URL                  draw.io 服务地址 (默认 http://localhost:8080)
  DRAWIO_REJECT_UNAUTHORIZED  HTTPS 证书验证 (默认 false)

示例:
  # 检查服务状态
  node skill.js status

  # 创建流程图模板
  node skill.js new myflow --template flowchart

  # 添加节点
  node skill.js add myflow.drawio "用户请求" --shape roundedRect --color blue --x 200 --y 100

  # 连接节点
  node skill.js connect myflow.drawio 1 2 --label "请求"

  # 批量创建（从 JSON 文件）
  node skill.js batch myflow.drawio data.json

  # 生成在线编辑 URL
  node skill.js edit myflow.drawio

  # 列出形状
  node skill.js shapes --query flow

  # 查看颜色
  node skill.js shapes --query color

  # 导出为 SVG
  node skill.js export myflow.drawio svg
`);
}

// ===================== 命令分发 =====================

const COMMANDS = {
  status:   { handler: (opts) => cmdStatus(opts), args: [], req: [] },
  new:      { handler: (opts, pos) => cmdNew(opts, pos), args: ["name"], req: ["图表名称"] },
  add:      { handler: (opts, pos) => cmdAdd(opts, pos), args: ["file", "label"], req: ["文件路径", "节点文本"] },
  connect:  { handler: (opts, pos) => cmdConnect(opts, pos), args: ["file", "source", "target"], req: ["文件路径", "源节点ID", "目标节点ID"] },
  batch:    { handler: (opts, pos) => cmdBatch(opts, pos), args: ["file", "data"], req: ["文件路径", "JSON数据文件"] },
  export:   { handler: (opts, pos) => cmdExport(opts, pos), args: ["file"], req: ["文件路径"] },
  edit:     { handler: (opts, pos) => cmdEdit(opts, pos), args: ["file"], req: ["文件路径"] },
  view:     { handler: (opts, pos) => cmdView(opts, pos), args: ["file"], req: ["文件路径"] },
  shapes:   { handler: (opts) => cmdShapes(opts), args: [], req: [] },
  config:   { handler: () => cmdConfig(), args: [], req: [] },
  help:     { handler: () => cmdHelp(), args: [], req: [] },
};

// ===================== 主入口 =====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    return;
  }

  if (args[0] === "-v" || args[0] === "--version") {
    console.log(`私有化 draw.io 远程操作工具 v${SKILL_VERSION}`);
    return;
  }

  const command = args[0];
  const { opts, positional } = parseOptions(args, 1);
  const cmd = COMMANDS[command];

  if (!cmd) {
    console.log(JSON.stringify({ error: "未知命令", message: `不支持命令: ${command}，使用 --help 查看帮助` }, null, 2));
    return;
  }

  // 检查必需参数
  for (let i = 0; i < cmd.args.length; i++) {
    if (!positional[i]) {
      console.log(JSON.stringify({ error: "参数错误", message: `${command} 命令需要${cmd.req[i]}参数` }, null, 2));
      return;
    }
  }

  const result = cmd.handler(opts, positional);
  console.log(JSON.stringify(await result, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: "程序错误", message: err.message }));
  process.exit(1);
});
