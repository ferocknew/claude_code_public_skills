#!/usr/bin/env node
/**
 * 高德地图个人查询工具
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   search   关键词搜索POI
 *   search2  关键词搜索POI 2.0
 *   around   周边搜索POI
 *   around2  周边搜索POI 2.0
 *   geo      地址转坐标
 *   regeo    坐标转地址
 *   ip       IP定位
 *   walk     步行路线规划
 *   drive    驾车路线规划
 *   transit  公交路线规划
 *   traffic  圆形区域交通态势
 *   trect    矩形区域交通态势
 *   troad    指定线路交通态势
 *   locate   验证地址真实性并生成 WAP URL
 */

const { SKILL_VERSION, loadDotEnv } = require("./lib/api");
const { cmdSearch, cmdAround, cmdAround2, cmdSearch2 } = require("./lib/poi");
const { cmdGeo, cmdRegeo, cmdLocate } = require("./lib/geocode");
const { cmdWalk, cmdDrive, cmdTransit } = require("./lib/route");
const { cmdTraffic, cmdTrafficRect, cmdTrafficRoad } = require("./lib/traffic");
const { cmdIp } = require("./lib/ip");

loadDotEnv(__dirname);

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
高德地图个人查询工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [args] [options]

命令:
  search <关键词>              关键词搜索POI
  search2                      关键词搜索POI 2.0
  around <关键词>              周边搜索POI
  around2                      周边搜索POI 2.0
  geo <地址>                   地址转坐标
  regeo <经度> <纬度>          坐标转地址
  ip <IP地址>                  IP定位
  walk <起点> <终点>           步行路线规划
  drive <起点> <终点>          驾车路线规划
  transit <起点> <终点>        公交路线规划
  traffic <经度,纬度>          圆形区域交通态势
  trect <左下坐标;右上坐标>    矩形区域交通态势
  troad <道路名称>             指定线路交通态势
  locate <地址>                验证地址真实性并生成 WAP URL

选项:
  --city <城市>                指定城市
  --limit <数量>               限制结果数量（默认20，最大100）
  --location <经度,纬度>       中心点坐标（around 命令必需）
  --radius <米>                搜索半径（around/traffic 命令）
  --types <类型>               POI类型（around 命令可选）
  --level <1-6>                道路等级（traffic 命令，1高速~6无名道路）
  --extensions <base|all>      返回结果控制（traffic 命令，默认base）

示例:
  node skill.js search "烤鸭" --city 北京 --limit 5
  node skill.js search2 --keywords "加油站" --region 上海 --limit 5
  node skill.js around "餐厅" --location "116.397,39.909" --radius 1000
  node skill.js around2 --location "121.487,31.250" --keywords "加油站" --radius 3000
  node skill.js geo "北京市朝阳区三里屯"
  node skill.js regeo 116.397 39.909
  node skill.js ip 114.114.114.114
  node skill.js walk "116.397,39.909" "116.398,39.918"
  node skill.js drive "116.397,39.909" "116.398,39.918"
  node skill.js transit "116.397,39.909" "116.398,39.918" --city 北京
  node skill.js traffic "116.305,39.986" --radius 1500 --level 4 --extensions all
  node skill.js trect "116.351,39.966;116.357,39.969"
  node skill.js troad "北环大道" --city 深圳
  node skill.js locate "北京市朝阳区三里屯"

环境变量:
  AMAP_API_KEY    高德地图 Web服务 API Key（必需）
`);
}

// ===================== 命令分发 =====================

const COMMANDS = {
  search:  { handler: (opts, pos) => cmdSearch(pos[0], opts), args: ["keywords"], req: ["关键词"] },
  search2: { handler: (opts) => cmdSearch2(opts), args: [], req: [] },
  around:  { handler: (opts, pos) => cmdAround(pos[0], opts.location, opts), args: ["keywords"], req: ["关键词"] },
  around2: { handler: (opts) => cmdAround2(opts), args: [], req: [] },
  geo:     { handler: (opts, pos) => cmdGeo(pos[0], opts), args: ["address"], req: ["地址"] },
  regeo:   { handler: (opts, pos) => cmdRegeo(pos[0], pos[1]), args: ["longitude", "latitude"], req: ["经度", "纬度"] },
  ip:      { handler: (opts, pos) => cmdIp(pos[0]), args: ["ip"], req: ["IP 地址"] },
  walk:    { handler: (opts, pos) => cmdWalk(pos[0], pos[1]), args: ["origin", "destination"], req: ["起点和终点"] },
  drive:   { handler: (opts, pos) => cmdDrive(pos[0], pos[1]), args: ["origin", "destination"], req: ["起点和终点"] },
  transit: { handler: (opts, pos) => cmdTransit(pos[0], pos[1], opts), args: ["origin", "destination"], req: ["起点和终点"] },
  traffic: { handler: (opts, pos) => cmdTraffic(pos[0], opts), args: ["location"], req: ["中心点坐标"] },
  trect:   { handler: (opts, pos) => cmdTrafficRect(pos[0], opts), args: ["rectangle"], req: ["矩形坐标对"] },
  troad:   { handler: (opts, pos) => cmdTrafficRoad(pos[0], opts), args: ["name"], req: ["道路名称"] },
  locate:  { handler: (opts, pos) => cmdLocate(pos[0], opts), args: ["address"], req: ["地址"] },
};

// ===================== 主入口 =====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    return;
  }

  if (args[0] === "-v" || args[0] === "--version") {
    console.log(`高德地图个人查询工具 v${SKILL_VERSION}`);
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
