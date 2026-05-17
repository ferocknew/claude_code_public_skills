const { amapGet } = require("./api");

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

module.exports = { cmdIp };
