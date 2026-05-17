#!/usr/bin/env node
/**
 * 高德地图个人查询工具
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   search   关键词搜索POI
 *   around   周边搜索POI
 *   geo      地址转坐标
 *   regeo    坐标转地址
 *   ip       IP定位
 *   walk     步行路线规划
 *   drive    驾车路线规划
 *   transit  公交路线规划
 *   map      生成个人地图二维码
 */

const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "dev";
const BASE_URL = "https://restapi.amap.com/v3";
const WIA_BASE_URL = "https://restapi.amap.com";

// ===================== API Key =====================

function getApiKey() {
  return process.env.AMAP_API_KEY || null;
}

function apiKeyMissingError() {
  return {
    error: "API Key 缺失",
    message:
      "未检测到高德地图 API Key\n\n" +
      "请按照以下步骤配置：\n" +
      "  1. 访问 https://lbs.amap.com/ 注册账号\n" +
      "  2. 创建应用，获取 Web服务 API Key\n" +
      "  3. 设置环境变量：export AMAP_API_KEY='your_key'\n" +
      "  4. 或运行时：AMAP_API_KEY=your_key node skill.js <command>",
  };
}

// ===================== HTTP 封装 =====================

async function amapGet(path, params) {
  const apiKey = getApiKey();
  if (!apiKey) return apiKeyMissingError();

  const url = new URL(path, BASE_URL);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    return await res.json();
  } catch (e) {
    return { error: "请求失败", message: e.message };
  }
}

async function amapPost(path, queryParams, body) {
  const apiKey = getApiKey();
  if (!apiKey) return apiKeyMissingError();

  const url = new URL(path, WIA_BASE_URL);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    return await res.json();
  } catch (e) {
    return { error: "请求失败", message: e.message };
  }
}

// ===================== POI 解析 =====================

function parsePoi(poi) {
  const loc = poi.location || "";
  let longitude = null, latitude = null;
  if (loc && loc.includes(",")) {
    const [lon, lat] = loc.split(",");
    longitude = parseFloat(lon) || null;
    latitude = parseFloat(lat) || null;
  }
  const result = {
    id: poi.id || "",
    name: poi.name || "",
    location: { longitude, latitude },
    address: poi.address || "",
    tel: poi.tel || "",
  };
  if (poi.distance !== undefined) {
    result.distance = poi.distance;
  }
  return result;
}

// ===================== 命令处理函数 =====================

async function cmdSearch(keywords, opts) {
  const params = {
    keywords,
    city: opts.city || undefined,
    offset: Math.min(parseInt(opts.limit) || 20, 100),
    page: opts.page || 1,
  };
  const result = await amapGet("/v3/place/text", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return (result.pois || []).map(parsePoi);
  }
  return { error: "搜索失败", message: result.info || "未知错误" };
}

async function cmdAround(keywords, location, opts) {
  if (!location) {
    return { error: "参数错误", message: "周边搜索需要 --location 参数（格式：经度,纬度）" };
  }
  const params = {
    keywords,
    location,
    radius: opts.radius || 1000,
    types: opts.types || undefined,
    offset: Math.min(parseInt(opts.limit) || 20, 100),
    page: opts.page || 1,
  };
  const result = await amapGet("/v3/place/around", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return (result.pois || []).map(parsePoi);
  }
  return { error: "周边搜索失败", message: result.info || "未知错误" };
}

async function cmdGeo(address, opts) {
  const params = {
    address,
    city: opts.city || undefined,
  };
  const result = await amapGet("/v3/geocode/geo", params);
  if (result.error) return result;
  if (String(result.status) === "1" && parseInt(result.count) > 0) {
    const geo = result.geocodes[0];
    const loc = geo.location || "";
    const [lon, lat] = loc.split(",");
    return {
      longitude: parseFloat(lon) || null,
      latitude: parseFloat(lat) || null,
      formatted_address: geo.formatted_address || "",
    };
  }
  return { error: "无法找到该地址", message: result.info || "未知错误" };
}

async function cmdRegeo(longitude, latitude) {
  const params = {
    location: `${longitude},${latitude}`,
    poitype: "",
    radius: 1000,
    extensions: "base",
    batch: "false",
    roadlevel: 0,
  };
  const result = await amapGet("/v3/geocode/regeo", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    const regeo = result.regeocode || {};
    const addr = regeo.addressComponent || {};
    return {
      formatted_address: regeo.formatted_address || "",
      country: addr.country || "",
      province: addr.province || "",
      city: addr.city || "",
      district: addr.district || "",
    };
  }
  return { error: "逆地理编码失败", message: result.info || "未知错误" };
}

async function cmdIp(ip) {
  const params = { ip };
  const result = await amapGet("/v3/ip", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return {
      province: result.province || "",
      city: result.city || "",
      adcode: result.adcode || "",
      rectangle: result.rectangle || "",
      isp: result.isp || "",
      location: result.loc || "",
      ip,
    };
  }
  return { error: "IP定位失败", message: result.info || "未知错误" };
}

async function cmdWalk(origin, destination) {
  const result = await amapGet("/v3/direction/walking", { origin, destination });
  if (result.error) return result;
  if (String(result.status) === "1") {
    const path = (result.route?.paths || [])[0] || {};
    return {
      distance: path.distance || "0",
      duration: path.duration || "0",
      origin,
      destination,
    };
  }
  return { error: "路径规划失败", message: result.info || "未知错误" };
}

async function cmdDrive(origin, destination) {
  const result = await amapGet("/v3/direction/driving", { origin, destination });
  if (result.error) return result;
  if (String(result.status) === "1") {
    const path = (result.route?.paths || [])[0] || {};
    return {
      distance: path.distance || "0",
      duration: path.duration || "0",
      origin,
      destination,
    };
  }
  return { error: "路径规划失败", message: result.info || "未知错误" };
}

async function cmdTransit(origin, destination, opts) {
  const city = opts.city || "北京";
  const result = await amapGet("/v3/direction/transit/integrated", {
    origin, destination, city,
  });
  if (result.error) return result;
  if (String(result.status) === "1") {
    const transit = (result.route?.transits || [])[0] || {};
    return {
      distance: transit.distance || "0",
      duration: transit.duration || "0",
      city,
      origin,
      destination,
    };
  }
  return { error: "路径规划失败", message: result.info || "未知错误" };
}

async function cmdMap(orgName, opts) {
  const pointsStr = opts.points;
  if (!pointsStr) {
    return { error: "参数错误", message: "生成地图需要 --points 参数（JSON 格式的行程列表）" };
  }

  let lineList;
  try {
    lineList = JSON.parse(pointsStr);
  } catch (e) {
    return { error: "参数错误", message: `--points JSON 解析失败: ${e.message}` };
  }

  const sceneType = parseInt(opts.scene) || 1;
  if (![1, 2, 3].includes(sceneType)) {
    return { error: "参数错误", message: "--scene 只能是 1、2 或 3" };
  }

  const queryParams = { source: "personal-map" };
  const body = {
    channel: "60000001",
    orgName,
    lineList,
    sceneType,
  };

  const result = await amapPost("/rest/wia/mcp/schema", queryParams, body);
  if (result.error) return result;

  if (result.code === 1 && result.result === true) {
    const schemaUrl = result.data?.schemaUrl || "";
    if (!schemaUrl) {
      return { error: "生成地图行程失败", message: "未返回有效的行程链接" };
    }
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(schemaUrl)}`;
    return {
      qr_code_url: qrCodeUrl,
      lineList,
      message: "个人地图小程序二维码已生成！请使用高德地图App扫描二维码查看专属地图。",
      schema_url: schemaUrl,
    };
  }

  return {
    error: "生成地图行程失败",
    message: result.message || result.info || "未知错误",
  };
}

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
  around <关键词>              周边搜索POI
  geo <地址>                   地址转坐标
  regeo <经度> <纬度>          坐标转地址
  ip <IP地址>                  IP定位
  walk <起点> <终点>           步行路线规划
  drive <起点> <终点>          驾车路线规划
  transit <起点> <终点>        公交路线规划
  map <地图名称>               生成个人地图二维码

选项:
  --city <城市>                指定城市
  --limit <数量>               限制结果数量（默认20，最大100）
  --location <经度,纬度>       中心点坐标（around 命令必需）
  --radius <米>                搜索半径（around 命令，默认1000）
  --types <类型>               POI类型（around 命令可选）
  --points <JSON>              行程点列表（map 命令必需）
  --scene <1|2|3>              场景类型（map 命令，默认1）

sceneType 说明:
  1 - 创建资源点且创建路线（默认，通用场景）
  2 - 仅创建资源点（搜索类数据，点之间无关联）
  3 - 仅创建路线（路径规划类数据，点之间有关联）

示例:
  node skill.js search "烤鸭" --city 北京 --limit 5
  node skill.js around "餐厅" --location "116.397,39.909" --radius 1000
  node skill.js geo "北京市朝阳区三里屯"
  node skill.js regeo 116.397 39.909
  node skill.js ip 114.114.114.114
  node skill.js walk "116.397,39.909" "116.398,39.918"
  node skill.js drive "116.397,39.909" "116.398,39.918"
  node skill.js transit "116.397,39.909" "116.398,39.918" --city 北京
  node skill.js map "北京一日游" --points '[{"title":"北京一日游","pointInfoList":[{"name":"天安门","lon":116.397,"lat":39.909,"poiId":"B000A8URXB"}]}]' --scene 2

环境变量:
  AMAP_API_KEY    高德地图 Web服务 API Key（必需）
`);
}

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

  let result;

  switch (command) {
    case "search": {
      const keywords = positional[0];
      if (!keywords) {
        result = { error: "参数错误", message: "search 命令需要关键词参数" };
        break;
      }
      result = await cmdSearch(keywords, opts);
      break;
    }

    case "around": {
      const keywords = positional[0];
      if (!keywords) {
        result = { error: "参数错误", message: "around 命令需要关键词参数" };
        break;
      }
      result = await cmdAround(keywords, opts.location, opts);
      break;
    }

    case "geo": {
      const address = positional[0];
      if (!address) {
        result = { error: "参数错误", message: "geo 命令需要地址参数" };
        break;
      }
      result = await cmdGeo(address, opts);
      break;
    }

    case "regeo": {
      const longitude = positional[0];
      const latitude = positional[1];
      if (!longitude || !latitude) {
        result = { error: "参数错误", message: "regeo 命令需要经度和纬度参数" };
        break;
      }
      result = await cmdRegeo(longitude, latitude);
      break;
    }

    case "ip": {
      const ip = positional[0];
      if (!ip) {
        result = { error: "参数错误", message: "ip 命令需要 IP 地址参数" };
        break;
      }
      result = await cmdIp(ip);
      break;
    }

    case "walk": {
      const origin = positional[0];
      const destination = positional[1];
      if (!origin || !destination) {
        result = { error: "参数错误", message: "walk 命令需要起点和终点参数（格式：经度,纬度）" };
        break;
      }
      result = await cmdWalk(origin, destination);
      break;
    }

    case "drive": {
      const origin = positional[0];
      const destination = positional[1];
      if (!origin || !destination) {
        result = { error: "参数错误", message: "drive 命令需要起点和终点参数（格式：经度,纬度）" };
        break;
      }
      result = await cmdDrive(origin, destination);
      break;
    }

    case "transit": {
      const origin = positional[0];
      const destination = positional[1];
      if (!origin || !destination) {
        result = { error: "参数错误", message: "transit 命令需要起点和终点参数（格式：经度,纬度）" };
        break;
      }
      result = await cmdTransit(origin, destination, opts);
      break;
    }

    case "map": {
      const orgName = positional[0];
      if (!orgName) {
        result = { error: "参数错误", message: "map 命令需要地图名称参数" };
        break;
      }
      result = await cmdMap(orgName, opts);
      break;
    }

    default:
      result = { error: "未知命令", message: `不支持命令: ${command}，使用 --help 查看帮助` };
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: "程序错误", message: err.message }));
  process.exit(1);
});
