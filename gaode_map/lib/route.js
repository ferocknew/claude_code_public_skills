const { amapGet } = require("./api");

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

module.exports = { cmdWalk, cmdDrive, cmdTransit };
