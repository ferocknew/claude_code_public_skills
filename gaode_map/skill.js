#!/usr/bin/env node
// 高德地图个人查询工具 v260517.134302 - 无需安装依赖


// run.js
var SKILL_VERSION = true ? "260517.134302" : "dev";
var BASE_URL = "https://restapi.amap.com/v3";
var WIA_BASE_URL = "https://restapi.amap.com";
function getApiKey() {
  return process.env.AMAP_API_KEY || null;
}
function apiKeyMissingError() {
  return {
    error: "API Key \u7F3A\u5931",
    message: "\u672A\u68C0\u6D4B\u5230\u9AD8\u5FB7\u5730\u56FE API Key\n\n\u8BF7\u6309\u7167\u4EE5\u4E0B\u6B65\u9AA4\u914D\u7F6E\uFF1A\n  1. \u8BBF\u95EE https://lbs.amap.com/ \u6CE8\u518C\u8D26\u53F7\n  2. \u521B\u5EFA\u5E94\u7528\uFF0C\u83B7\u53D6 Web\u670D\u52A1 API Key\n  3. \u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF\uFF1Aexport AMAP_API_KEY='your_key'\n  4. \u6216\u8FD0\u884C\u65F6\uFF1AAMAP_API_KEY=your_key node skill.js <command>"
  };
}
async function amapGet(path, params) {
  const apiKey = getApiKey();
  if (!apiKey) return apiKeyMissingError();
  const url = new URL(path, BASE_URL);
  url.searchParams.set("key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0 && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15e3) });
    return await res.json();
  } catch (e) {
    return { error: "\u8BF7\u6C42\u5931\u8D25", message: e.message };
  }
}
async function amapPost(path, queryParams, body) {
  const apiKey = getApiKey();
  if (!apiKey) return apiKeyMissingError();
  const url = new URL(path, WIA_BASE_URL);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== void 0 && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }
  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15e3)
    });
    return await res.json();
  } catch (e) {
    return { error: "\u8BF7\u6C42\u5931\u8D25", message: e.message };
  }
}
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
    tel: poi.tel || ""
  };
  if (poi.distance !== void 0) {
    result.distance = poi.distance;
  }
  return result;
}
async function cmdSearch(keywords, opts) {
  const params = {
    keywords,
    city: opts.city || void 0,
    offset: Math.min(parseInt(opts.limit) || 20, 100),
    page: opts.page || 1
  };
  const result = await amapGet("/v3/place/text", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return (result.pois || []).map(parsePoi);
  }
  return { error: "\u641C\u7D22\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
}
async function cmdAround(keywords, location, opts) {
  if (!location) {
    return { error: "\u53C2\u6570\u9519\u8BEF", message: "\u5468\u8FB9\u641C\u7D22\u9700\u8981 --location \u53C2\u6570\uFF08\u683C\u5F0F\uFF1A\u7ECF\u5EA6,\u7EAC\u5EA6\uFF09" };
  }
  const params = {
    keywords,
    location,
    radius: opts.radius || 1e3,
    types: opts.types || void 0,
    offset: Math.min(parseInt(opts.limit) || 20, 100),
    page: opts.page || 1
  };
  const result = await amapGet("/v3/place/around", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return (result.pois || []).map(parsePoi);
  }
  return { error: "\u5468\u8FB9\u641C\u7D22\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
}
async function cmdGeo(address, opts) {
  const params = {
    address,
    city: opts.city || void 0
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
      formatted_address: geo.formatted_address || ""
    };
  }
  return { error: "\u65E0\u6CD5\u627E\u5230\u8BE5\u5730\u5740", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
}
async function cmdRegeo(longitude, latitude) {
  const params = {
    location: `${longitude},${latitude}`,
    poitype: "",
    radius: 1e3,
    extensions: "base",
    batch: "false",
    roadlevel: 0
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
      district: addr.district || ""
    };
  }
  return { error: "\u9006\u5730\u7406\u7F16\u7801\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
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
      ip
    };
  }
  return { error: "IP\u5B9A\u4F4D\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
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
      destination
    };
  }
  return { error: "\u8DEF\u5F84\u89C4\u5212\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
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
      destination
    };
  }
  return { error: "\u8DEF\u5F84\u89C4\u5212\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
}
async function cmdTransit(origin, destination, opts) {
  const city = opts.city || "\u5317\u4EAC";
  const result = await amapGet("/v3/direction/transit/integrated", {
    origin,
    destination,
    city
  });
  if (result.error) return result;
  if (String(result.status) === "1") {
    const transit = (result.route?.transits || [])[0] || {};
    return {
      distance: transit.distance || "0",
      duration: transit.duration || "0",
      city,
      origin,
      destination
    };
  }
  return { error: "\u8DEF\u5F84\u89C4\u5212\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
}
async function cmdMap(orgName, opts) {
  const pointsStr = opts.points;
  if (!pointsStr) {
    return { error: "\u53C2\u6570\u9519\u8BEF", message: "\u751F\u6210\u5730\u56FE\u9700\u8981 --points \u53C2\u6570\uFF08JSON \u683C\u5F0F\u7684\u884C\u7A0B\u5217\u8868\uFF09" };
  }
  let lineList;
  try {
    lineList = JSON.parse(pointsStr);
  } catch (e) {
    return { error: "\u53C2\u6570\u9519\u8BEF", message: `--points JSON \u89E3\u6790\u5931\u8D25: ${e.message}` };
  }
  const sceneType = parseInt(opts.scene) || 1;
  if (![1, 2, 3].includes(sceneType)) {
    return { error: "\u53C2\u6570\u9519\u8BEF", message: "--scene \u53EA\u80FD\u662F 1\u30012 \u6216 3" };
  }
  const queryParams = { source: "personal-map" };
  const body = {
    channel: "60000001",
    orgName,
    lineList,
    sceneType
  };
  const result = await amapPost("/rest/wia/mcp/schema", queryParams, body);
  if (result.error) return result;
  if (result.code === 1 && result.result === true) {
    const schemaUrl = result.data?.schemaUrl || "";
    if (!schemaUrl) {
      return { error: "\u751F\u6210\u5730\u56FE\u884C\u7A0B\u5931\u8D25", message: "\u672A\u8FD4\u56DE\u6709\u6548\u7684\u884C\u7A0B\u94FE\u63A5" };
    }
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(schemaUrl)}`;
    return {
      qr_code_url: qrCodeUrl,
      lineList,
      message: "\u4E2A\u4EBA\u5730\u56FE\u5C0F\u7A0B\u5E8F\u4E8C\u7EF4\u7801\u5DF2\u751F\u6210\uFF01\u8BF7\u4F7F\u7528\u9AD8\u5FB7\u5730\u56FEApp\u626B\u63CF\u4E8C\u7EF4\u7801\u67E5\u770B\u4E13\u5C5E\u5730\u56FE\u3002",
      schema_url: schemaUrl
    };
  }
  return {
    error: "\u751F\u6210\u5730\u56FE\u884C\u7A0B\u5931\u8D25",
    message: result.message || result.info || "\u672A\u77E5\u9519\u8BEF"
  };
}
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
\u9AD8\u5FB7\u5730\u56FE\u4E2A\u4EBA\u67E5\u8BE2\u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [args] [options]

\u547D\u4EE4:
  search <\u5173\u952E\u8BCD>              \u5173\u952E\u8BCD\u641C\u7D22POI
  around <\u5173\u952E\u8BCD>              \u5468\u8FB9\u641C\u7D22POI
  geo <\u5730\u5740>                   \u5730\u5740\u8F6C\u5750\u6807
  regeo <\u7ECF\u5EA6> <\u7EAC\u5EA6>          \u5750\u6807\u8F6C\u5730\u5740
  ip <IP\u5730\u5740>                  IP\u5B9A\u4F4D
  walk <\u8D77\u70B9> <\u7EC8\u70B9>           \u6B65\u884C\u8DEF\u7EBF\u89C4\u5212
  drive <\u8D77\u70B9> <\u7EC8\u70B9>          \u9A7E\u8F66\u8DEF\u7EBF\u89C4\u5212
  transit <\u8D77\u70B9> <\u7EC8\u70B9>        \u516C\u4EA4\u8DEF\u7EBF\u89C4\u5212
  map <\u5730\u56FE\u540D\u79F0>               \u751F\u6210\u4E2A\u4EBA\u5730\u56FE\u4E8C\u7EF4\u7801

\u9009\u9879:
  --city <\u57CE\u5E02>                \u6307\u5B9A\u57CE\u5E02
  --limit <\u6570\u91CF>               \u9650\u5236\u7ED3\u679C\u6570\u91CF\uFF08\u9ED8\u8BA420\uFF0C\u6700\u5927100\uFF09
  --location <\u7ECF\u5EA6,\u7EAC\u5EA6>       \u4E2D\u5FC3\u70B9\u5750\u6807\uFF08around \u547D\u4EE4\u5FC5\u9700\uFF09
  --radius <\u7C73>                \u641C\u7D22\u534A\u5F84\uFF08around \u547D\u4EE4\uFF0C\u9ED8\u8BA41000\uFF09
  --types <\u7C7B\u578B>               POI\u7C7B\u578B\uFF08around \u547D\u4EE4\u53EF\u9009\uFF09
  --points <JSON>              \u884C\u7A0B\u70B9\u5217\u8868\uFF08map \u547D\u4EE4\u5FC5\u9700\uFF09
  --scene <1|2|3>              \u573A\u666F\u7C7B\u578B\uFF08map \u547D\u4EE4\uFF0C\u9ED8\u8BA41\uFF09

sceneType \u8BF4\u660E:
  1 - \u521B\u5EFA\u8D44\u6E90\u70B9\u4E14\u521B\u5EFA\u8DEF\u7EBF\uFF08\u9ED8\u8BA4\uFF0C\u901A\u7528\u573A\u666F\uFF09
  2 - \u4EC5\u521B\u5EFA\u8D44\u6E90\u70B9\uFF08\u641C\u7D22\u7C7B\u6570\u636E\uFF0C\u70B9\u4E4B\u95F4\u65E0\u5173\u8054\uFF09
  3 - \u4EC5\u521B\u5EFA\u8DEF\u7EBF\uFF08\u8DEF\u5F84\u89C4\u5212\u7C7B\u6570\u636E\uFF0C\u70B9\u4E4B\u95F4\u6709\u5173\u8054\uFF09

\u793A\u4F8B:
  node skill.js search "\u70E4\u9E2D" --city \u5317\u4EAC --limit 5
  node skill.js around "\u9910\u5385" --location "116.397,39.909" --radius 1000
  node skill.js geo "\u5317\u4EAC\u5E02\u671D\u9633\u533A\u4E09\u91CC\u5C6F"
  node skill.js regeo 116.397 39.909
  node skill.js ip 114.114.114.114
  node skill.js walk "116.397,39.909" "116.398,39.918"
  node skill.js drive "116.397,39.909" "116.398,39.918"
  node skill.js transit "116.397,39.909" "116.398,39.918" --city \u5317\u4EAC
  node skill.js map "\u5317\u4EAC\u4E00\u65E5\u6E38" --points '[{"title":"\u5317\u4EAC\u4E00\u65E5\u6E38","pointInfoList":[{"name":"\u5929\u5B89\u95E8","lon":116.397,"lat":39.909,"poiId":"B000A8URXB"}]}]' --scene 2

\u73AF\u5883\u53D8\u91CF:
  AMAP_API_KEY    \u9AD8\u5FB7\u5730\u56FE Web\u670D\u52A1 API Key\uFF08\u5FC5\u9700\uFF09
`);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    return;
  }
  if (args[0] === "-v" || args[0] === "--version") {
    console.log(`\u9AD8\u5FB7\u5730\u56FE\u4E2A\u4EBA\u67E5\u8BE2\u5DE5\u5177 v${SKILL_VERSION}`);
    return;
  }
  const command = args[0];
  const { opts, positional } = parseOptions(args, 1);
  let result;
  switch (command) {
    case "search": {
      const keywords = positional[0];
      if (!keywords) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "search \u547D\u4EE4\u9700\u8981\u5173\u952E\u8BCD\u53C2\u6570" };
        break;
      }
      result = await cmdSearch(keywords, opts);
      break;
    }
    case "around": {
      const keywords = positional[0];
      if (!keywords) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "around \u547D\u4EE4\u9700\u8981\u5173\u952E\u8BCD\u53C2\u6570" };
        break;
      }
      result = await cmdAround(keywords, opts.location, opts);
      break;
    }
    case "geo": {
      const address = positional[0];
      if (!address) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "geo \u547D\u4EE4\u9700\u8981\u5730\u5740\u53C2\u6570" };
        break;
      }
      result = await cmdGeo(address, opts);
      break;
    }
    case "regeo": {
      const longitude = positional[0];
      const latitude = positional[1];
      if (!longitude || !latitude) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "regeo \u547D\u4EE4\u9700\u8981\u7ECF\u5EA6\u548C\u7EAC\u5EA6\u53C2\u6570" };
        break;
      }
      result = await cmdRegeo(longitude, latitude);
      break;
    }
    case "ip": {
      const ip = positional[0];
      if (!ip) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "ip \u547D\u4EE4\u9700\u8981 IP \u5730\u5740\u53C2\u6570" };
        break;
      }
      result = await cmdIp(ip);
      break;
    }
    case "walk": {
      const origin = positional[0];
      const destination = positional[1];
      if (!origin || !destination) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "walk \u547D\u4EE4\u9700\u8981\u8D77\u70B9\u548C\u7EC8\u70B9\u53C2\u6570\uFF08\u683C\u5F0F\uFF1A\u7ECF\u5EA6,\u7EAC\u5EA6\uFF09" };
        break;
      }
      result = await cmdWalk(origin, destination);
      break;
    }
    case "drive": {
      const origin = positional[0];
      const destination = positional[1];
      if (!origin || !destination) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "drive \u547D\u4EE4\u9700\u8981\u8D77\u70B9\u548C\u7EC8\u70B9\u53C2\u6570\uFF08\u683C\u5F0F\uFF1A\u7ECF\u5EA6,\u7EAC\u5EA6\uFF09" };
        break;
      }
      result = await cmdDrive(origin, destination);
      break;
    }
    case "transit": {
      const origin = positional[0];
      const destination = positional[1];
      if (!origin || !destination) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "transit \u547D\u4EE4\u9700\u8981\u8D77\u70B9\u548C\u7EC8\u70B9\u53C2\u6570\uFF08\u683C\u5F0F\uFF1A\u7ECF\u5EA6,\u7EAC\u5EA6\uFF09" };
        break;
      }
      result = await cmdTransit(origin, destination, opts);
      break;
    }
    case "map": {
      const orgName = positional[0];
      if (!orgName) {
        result = { error: "\u53C2\u6570\u9519\u8BEF", message: "map \u547D\u4EE4\u9700\u8981\u5730\u56FE\u540D\u79F0\u53C2\u6570" };
        break;
      }
      result = await cmdMap(orgName, opts);
      break;
    }
    default:
      result = { error: "\u672A\u77E5\u547D\u4EE4", message: `\u4E0D\u652F\u6301\u547D\u4EE4: ${command}\uFF0C\u4F7F\u7528 --help \u67E5\u770B\u5E2E\u52A9` };
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch((err) => {
  console.error(JSON.stringify({ error: "\u7A0B\u5E8F\u9519\u8BEF", message: err.message }));
  process.exit(1);
});
