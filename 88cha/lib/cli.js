const { loadCookie, saveCookie } = require("./auth");

const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

function parseArgs() {
  const args = process.argv.slice(2);
  const params = { keyword: "", cookie: "", page: 1, pageSize: 10, raw: false, stream: false, person: false, patent: false, report: false };

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--cookie" || args[i] === "-k") && args[i + 1]) {
      params.cookie = args[++i];
    } else if ((args[i] === "--page" || args[i] === "-p") && args[i + 1]) {
      params.page = parseInt(args[++i], 10);
    } else if ((args[i] === "--size" || args[i] === "-s") && args[i + 1]) {
      params.pageSize = parseInt(args[++i], 10);
    } else if (args[i] === "--raw") {
      params.raw = true;
    } else if (args[i] === "--stream" || args[i] === "-S") {
      params.stream = true;
    } else if (args[i] === "--person" || args[i] === "-P") {
      params.person = true;
    } else if (args[i] === "--patent" || args[i] === "-T") {
      params.patent = true;
    } else if (args[i] === "--report" || args[i] === "-R") {
      params.report = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      process.exit(0);
    } else if (!args[i].startsWith("-") && !params.keyword) {
      params.keyword = args[i];
    }
  }

  if (!params.cookie && process.env.CHA88_COOKIE) params.cookie = process.env.CHA88_COOKIE;
  if (!params.cookie) params.cookie = loadCookie();
  if (args.some((a, i) => (a === "--cookie" || a === "-k") && args[i + 1])) {
    saveCookie(params.cookie);
  }
  return params;
}

function printHelp() {
  console.log(`88查企业搜索 v${SKILL_VERSION}

用法: node skill.js <关键词> [选项]

选项:
  --cookie, -k <string>  88cha.com 完整 Cookie（首次传入后自动保存）
  --page,   -p <number>  页码（默认: 1）
  --size,   -s <number>  每页数量（默认: 10）
  --stream, -S           深度搜索模式（SSE 流式返回）
  --person, -P           按人名查关联企业（法人、股东等）
  --patent, -T           搜索企业专利信息
  --report, -R           企业背调报告（SSE 流式返回）
  --raw                  输出原始 JSON
  --help,  -h            显示帮助

示例:
  node skill.js "腾讯" --cookie "YOUR_COOKIE"     # 首次使用，自动保存 Cookie
  node skill.js "阿里巴巴"                         # 后续直接搜索
  node skill.js "字节跳动" --page 2                # 翻页
  node skill.js "华为" --stream                    # 深度搜索
  node skill.js "马化腾" --person                  # 按人名查关联企业
  node skill.js "华为" --patent                    # 搜索企业专利
  node skill.js "腾讯" --report                    # 企业背调报告
  node skill.js "小米" --raw                       # 原始 JSON 输出
`);
}

module.exports = { parseArgs };
