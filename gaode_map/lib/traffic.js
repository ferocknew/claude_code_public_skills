const { amapGet } = require("./api");

async function cmdTraffic(location, opts) {
  const params = {
    location,
    radius: Math.min(parseInt(opts.radius) || 1500, 5000),
    level: opts.level || undefined,
    extensions: opts.extensions || "base",
  };
  const result = await amapGet("/v3/traffic/status/circle", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return parseTrafficInfo(result.trafficinfo, opts.extensions);
  }
  return { error: "交通态势查询失败", message: result.info || "未知错误" };
}

async function cmdTrafficRect(rectangle, opts) {
  const params = {
    rectangle,
    level: opts.level || undefined,
    extensions: opts.extensions || "base",
  };
  const result = await amapGet("/v3/traffic/status/rectangle", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return parseTrafficInfo(result.trafficinfo, opts.extensions);
  }
  return { error: "矩形交通态势查询失败", message: result.info || "未知错误" };
}

function parseTrafficInfo(info, extensions) {
  info = info || {};
  const output = {
    description: info.description || "",
    evaluation: info.evaluation || null,
  };
  if (extensions === "all" && info.roads) {
    output.roads = info.roads;
  }
  return output;
}

async function cmdTrafficRoad(name, opts) {
  const params = {
    name,
    city: opts.city || undefined,
    adcode: opts.adcode || undefined,
    level: opts.level || undefined,
    extensions: opts.extensions || "base",
  };
  const result = await amapGet("/v3/traffic/status/road", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return parseTrafficInfo(result.trafficinfo, opts.extensions);
  }
  return { error: "线路交通态势查询失败", message: result.info || "未知错误" };
}

module.exports = { cmdTraffic, cmdTrafficRect, cmdTrafficRoad };
