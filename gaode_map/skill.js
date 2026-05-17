#!/usr/bin/env node
// 高德地图个人查询工具 v260517.142426 - 无需安装依赖

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var SKILL_VERSION2 = true ? "260517.142426" : "dev";
    var BASE_URL = "https://restapi.amap.com/v3";
    function loadDotEnv2(baseDir) {
      const fs = require("fs");
      const path = require("path");
      const envPath = path.join(baseDir, ".env");
      if (!fs.existsSync(envPath)) return;
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
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
    module2.exports = { SKILL_VERSION: SKILL_VERSION2, BASE_URL, loadDotEnv: loadDotEnv2, getApiKey, amapGet };
  }
});

// lib/poi.js
var require_poi = __commonJS({
  "lib/poi.js"(exports2, module2) {
    var { amapGet } = require_api();
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
    async function cmdSearch3(keywords, opts) {
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
    async function cmdAround3(keywords, location, opts) {
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
    async function cmdAround22(opts) {
      const location = opts.location;
      if (!location) {
        return { error: "\u53C2\u6570\u9519\u8BEF", message: "around2 \u547D\u4EE4\u9700\u8981 --location \u53C2\u6570\uFF08\u683C\u5F0F\uFF1A\u7ECF\u5EA6,\u7EAC\u5EA6\uFF09" };
      }
      const params = {
        keywords: opts.keywords || void 0,
        location,
        radius: Math.min(parseInt(opts.radius) || 1e3, 5e4),
        types: opts.types || void 0,
        sortrule: opts.sort || void 0,
        region: opts.region || void 0,
        show_fields: opts.fields || void 0,
        page_size: Math.min(parseInt(opts.limit) || 20, 25),
        page_num: opts.page || 1
      };
      const result = await amapGet("/v5/place/around", params);
      if (result.error) return result;
      if (String(result.status) === "1") {
        return (result.pois || []).map(parsePoiV5);
      }
      return { error: "\u5468\u8FB9\u641C\u7D222.0\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
    }
    function parsePoiV5(poi) {
      const loc = poi.location || "";
      let longitude = null, latitude = null;
      if (loc && loc.includes(",")) {
        const [lon, lat] = loc.split(",");
        longitude = parseFloat(lon) || null;
        latitude = parseFloat(lat) || null;
      }
      return {
        id: poi.id || "",
        name: poi.name || "",
        location: { longitude, latitude },
        address: poi.address || "",
        pname: poi.pname || "",
        cityname: poi.cityname || "",
        adname: poi.adname || "",
        type: poi.type || "",
        typecode: poi.typecode || "",
        distance: poi.distance || ""
      };
    }
    async function cmdSearch22(opts) {
      const params = {
        keywords: opts.keywords || void 0,
        types: opts.types || void 0,
        region: opts.region || void 0,
        city_limit: opts.city_limit || void 0,
        show_fields: opts.fields || void 0,
        page_size: Math.min(parseInt(opts.limit) || 20, 25),
        page_num: opts.page || 1
      };
      const result = await amapGet("/v5/place/text", params);
      if (result.error) return result;
      if (String(result.status) === "1") {
        return (result.pois || []).map(parsePoiV5);
      }
      return { error: "\u5173\u952E\u8BCD\u641C\u7D222.0\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
    }
    module2.exports = { cmdSearch: cmdSearch3, cmdAround: cmdAround3, cmdAround2: cmdAround22, cmdSearch2: cmdSearch22 };
  }
});

// lib/geocode.js
var require_geocode = __commonJS({
  "lib/geocode.js"(exports2, module2) {
    var { amapGet } = require_api();
    async function cmdGeo2(address, opts) {
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
    async function cmdRegeo2(longitude, latitude) {
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
    async function cmdLocate2(address, opts) {
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
        const longitude = parseFloat(lon) || null;
        const latitude = parseFloat(lat) || null;
        const wapUrl = `https://uri.amap.com/marker?position=${lon},${lat}&name=${encodeURIComponent(address)}`;
        return {
          address,
          verified: true,
          longitude,
          latitude,
          formatted_address: geo.formatted_address || "",
          wap_url: wapUrl
        };
      }
      return {
        address,
        verified: false,
        message: "\u65E0\u6CD5\u5728\u9AD8\u5FB7\u5730\u56FE\u4E2D\u627E\u5230\u8BE5\u5730\u5740\uFF0C\u5730\u5740\u53EF\u80FD\u4E0D\u5B58\u5728\u6216\u6709\u8BEF"
      };
    }
    module2.exports = { cmdGeo: cmdGeo2, cmdRegeo: cmdRegeo2, cmdLocate: cmdLocate2 };
  }
});

// lib/route.js
var require_route = __commonJS({
  "lib/route.js"(exports2, module2) {
    var { amapGet } = require_api();
    async function cmdWalk2(origin, destination) {
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
    async function cmdDrive2(origin, destination) {
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
    async function cmdTransit2(origin, destination, opts) {
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
    module2.exports = { cmdWalk: cmdWalk2, cmdDrive: cmdDrive2, cmdTransit: cmdTransit2 };
  }
});

// lib/traffic.js
var require_traffic = __commonJS({
  "lib/traffic.js"(exports2, module2) {
    var { amapGet } = require_api();
    async function cmdTraffic2(location, opts) {
      const params = {
        location,
        radius: Math.min(parseInt(opts.radius) || 1500, 5e3),
        level: opts.level || void 0,
        extensions: opts.extensions || "base"
      };
      const result = await amapGet("/v3/traffic/status/circle", params);
      if (result.error) return result;
      if (String(result.status) === "1") {
        return parseTrafficInfo(result.trafficinfo, opts.extensions);
      }
      return { error: "\u4EA4\u901A\u6001\u52BF\u67E5\u8BE2\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
    }
    async function cmdTrafficRect2(rectangle, opts) {
      const params = {
        rectangle,
        level: opts.level || void 0,
        extensions: opts.extensions || "base"
      };
      const result = await amapGet("/v3/traffic/status/rectangle", params);
      if (result.error) return result;
      if (String(result.status) === "1") {
        return parseTrafficInfo(result.trafficinfo, opts.extensions);
      }
      return { error: "\u77E9\u5F62\u4EA4\u901A\u6001\u52BF\u67E5\u8BE2\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
    }
    function parseTrafficInfo(info, extensions) {
      info = info || {};
      const output = {
        description: info.description || "",
        evaluation: info.evaluation || null
      };
      if (extensions === "all" && info.roads) {
        output.roads = info.roads;
      }
      return output;
    }
    async function cmdTrafficRoad2(name, opts) {
      const params = {
        name,
        city: opts.city || void 0,
        adcode: opts.adcode || void 0,
        level: opts.level || void 0,
        extensions: opts.extensions || "base"
      };
      const result = await amapGet("/v3/traffic/status/road", params);
      if (result.error) return result;
      if (String(result.status) === "1") {
        return parseTrafficInfo(result.trafficinfo, opts.extensions);
      }
      return { error: "\u7EBF\u8DEF\u4EA4\u901A\u6001\u52BF\u67E5\u8BE2\u5931\u8D25", message: result.info || "\u672A\u77E5\u9519\u8BEF" };
    }
    module2.exports = { cmdTraffic: cmdTraffic2, cmdTrafficRect: cmdTrafficRect2, cmdTrafficRoad: cmdTrafficRoad2 };
  }
});

// lib/ip.js
var require_ip = __commonJS({
  "lib/ip.js"(exports2, module2) {
    var { amapGet } = require_api();
    async function cmdIp2(ip) {
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
    module2.exports = { cmdIp: cmdIp2 };
  }
});

// run.js
var { SKILL_VERSION, loadDotEnv } = require_api();
var { cmdSearch, cmdAround, cmdAround2, cmdSearch2 } = require_poi();
var { cmdGeo, cmdRegeo, cmdLocate } = require_geocode();
var { cmdWalk, cmdDrive, cmdTransit } = require_route();
var { cmdTraffic, cmdTrafficRect, cmdTrafficRoad } = require_traffic();
var { cmdIp } = require_ip();
loadDotEnv(__dirname);
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
  search2                      \u5173\u952E\u8BCD\u641C\u7D22POI 2.0
  around <\u5173\u952E\u8BCD>              \u5468\u8FB9\u641C\u7D22POI
  around2                      \u5468\u8FB9\u641C\u7D22POI 2.0
  geo <\u5730\u5740>                   \u5730\u5740\u8F6C\u5750\u6807
  regeo <\u7ECF\u5EA6> <\u7EAC\u5EA6>          \u5750\u6807\u8F6C\u5730\u5740
  ip <IP\u5730\u5740>                  IP\u5B9A\u4F4D
  walk <\u8D77\u70B9> <\u7EC8\u70B9>           \u6B65\u884C\u8DEF\u7EBF\u89C4\u5212
  drive <\u8D77\u70B9> <\u7EC8\u70B9>          \u9A7E\u8F66\u8DEF\u7EBF\u89C4\u5212
  transit <\u8D77\u70B9> <\u7EC8\u70B9>        \u516C\u4EA4\u8DEF\u7EBF\u89C4\u5212
  traffic <\u7ECF\u5EA6,\u7EAC\u5EA6>          \u5706\u5F62\u533A\u57DF\u4EA4\u901A\u6001\u52BF
  trect <\u5DE6\u4E0B\u5750\u6807;\u53F3\u4E0A\u5750\u6807>    \u77E9\u5F62\u533A\u57DF\u4EA4\u901A\u6001\u52BF
  troad <\u9053\u8DEF\u540D\u79F0>             \u6307\u5B9A\u7EBF\u8DEF\u4EA4\u901A\u6001\u52BF
  locate <\u5730\u5740>                \u9A8C\u8BC1\u5730\u5740\u771F\u5B9E\u6027\u5E76\u751F\u6210 WAP URL

\u9009\u9879:
  --city <\u57CE\u5E02>                \u6307\u5B9A\u57CE\u5E02
  --limit <\u6570\u91CF>               \u9650\u5236\u7ED3\u679C\u6570\u91CF\uFF08\u9ED8\u8BA420\uFF0C\u6700\u5927100\uFF09
  --location <\u7ECF\u5EA6,\u7EAC\u5EA6>       \u4E2D\u5FC3\u70B9\u5750\u6807\uFF08around \u547D\u4EE4\u5FC5\u9700\uFF09
  --radius <\u7C73>                \u641C\u7D22\u534A\u5F84\uFF08around/traffic \u547D\u4EE4\uFF09
  --types <\u7C7B\u578B>               POI\u7C7B\u578B\uFF08around \u547D\u4EE4\u53EF\u9009\uFF09
  --level <1-6>                \u9053\u8DEF\u7B49\u7EA7\uFF08traffic \u547D\u4EE4\uFF0C1\u9AD8\u901F~6\u65E0\u540D\u9053\u8DEF\uFF09
  --extensions <base|all>      \u8FD4\u56DE\u7ED3\u679C\u63A7\u5236\uFF08traffic \u547D\u4EE4\uFF0C\u9ED8\u8BA4base\uFF09

\u793A\u4F8B:
  node skill.js search "\u70E4\u9E2D" --city \u5317\u4EAC --limit 5
  node skill.js search2 --keywords "\u52A0\u6CB9\u7AD9" --region \u4E0A\u6D77 --limit 5
  node skill.js around "\u9910\u5385" --location "116.397,39.909" --radius 1000
  node skill.js around2 --location "121.487,31.250" --keywords "\u52A0\u6CB9\u7AD9" --radius 3000
  node skill.js geo "\u5317\u4EAC\u5E02\u671D\u9633\u533A\u4E09\u91CC\u5C6F"
  node skill.js regeo 116.397 39.909
  node skill.js ip 114.114.114.114
  node skill.js walk "116.397,39.909" "116.398,39.918"
  node skill.js drive "116.397,39.909" "116.398,39.918"
  node skill.js transit "116.397,39.909" "116.398,39.918" --city \u5317\u4EAC
  node skill.js traffic "116.305,39.986" --radius 1500 --level 4 --extensions all
  node skill.js trect "116.351,39.966;116.357,39.969"
  node skill.js troad "\u5317\u73AF\u5927\u9053" --city \u6DF1\u5733
  node skill.js locate "\u5317\u4EAC\u5E02\u671D\u9633\u533A\u4E09\u91CC\u5C6F"

\u73AF\u5883\u53D8\u91CF:
  AMAP_API_KEY    \u9AD8\u5FB7\u5730\u56FE Web\u670D\u52A1 API Key\uFF08\u5FC5\u9700\uFF09
`);
}
var COMMANDS = {
  search: { handler: (opts, pos) => cmdSearch(pos[0], opts), args: ["keywords"], req: ["\u5173\u952E\u8BCD"] },
  search2: { handler: (opts) => cmdSearch2(opts), args: [], req: [] },
  around: { handler: (opts, pos) => cmdAround(pos[0], opts.location, opts), args: ["keywords"], req: ["\u5173\u952E\u8BCD"] },
  around2: { handler: (opts) => cmdAround2(opts), args: [], req: [] },
  geo: { handler: (opts, pos) => cmdGeo(pos[0], opts), args: ["address"], req: ["\u5730\u5740"] },
  regeo: { handler: (opts, pos) => cmdRegeo(pos[0], pos[1]), args: ["longitude", "latitude"], req: ["\u7ECF\u5EA6", "\u7EAC\u5EA6"] },
  ip: { handler: (opts, pos) => cmdIp(pos[0]), args: ["ip"], req: ["IP \u5730\u5740"] },
  walk: { handler: (opts, pos) => cmdWalk(pos[0], pos[1]), args: ["origin", "destination"], req: ["\u8D77\u70B9\u548C\u7EC8\u70B9"] },
  drive: { handler: (opts, pos) => cmdDrive(pos[0], pos[1]), args: ["origin", "destination"], req: ["\u8D77\u70B9\u548C\u7EC8\u70B9"] },
  transit: { handler: (opts, pos) => cmdTransit(pos[0], pos[1], opts), args: ["origin", "destination"], req: ["\u8D77\u70B9\u548C\u7EC8\u70B9"] },
  traffic: { handler: (opts, pos) => cmdTraffic(pos[0], opts), args: ["location"], req: ["\u4E2D\u5FC3\u70B9\u5750\u6807"] },
  trect: { handler: (opts, pos) => cmdTrafficRect(pos[0], opts), args: ["rectangle"], req: ["\u77E9\u5F62\u5750\u6807\u5BF9"] },
  troad: { handler: (opts, pos) => cmdTrafficRoad(pos[0], opts), args: ["name"], req: ["\u9053\u8DEF\u540D\u79F0"] },
  locate: { handler: (opts, pos) => cmdLocate(pos[0], opts), args: ["address"], req: ["\u5730\u5740"] }
};
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
  const cmd = COMMANDS[command];
  if (!cmd) {
    console.log(JSON.stringify({ error: "\u672A\u77E5\u547D\u4EE4", message: `\u4E0D\u652F\u6301\u547D\u4EE4: ${command}\uFF0C\u4F7F\u7528 --help \u67E5\u770B\u5E2E\u52A9` }, null, 2));
    return;
  }
  for (let i = 0; i < cmd.args.length; i++) {
    if (!positional[i]) {
      console.log(JSON.stringify({ error: "\u53C2\u6570\u9519\u8BEF", message: `${command} \u547D\u4EE4\u9700\u8981${cmd.req[i]}\u53C2\u6570` }, null, 2));
      return;
    }
  }
  const result = cmd.handler(opts, positional);
  console.log(JSON.stringify(await result, null, 2));
}
main().catch((err) => {
  console.error(JSON.stringify({ error: "\u7A0B\u5E8F\u9519\u8BEF", message: err.message }));
  process.exit(1);
});
