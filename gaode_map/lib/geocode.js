const { amapGet } = require("./api");

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

async function cmdLocate(address, opts) {
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
    const longitude = parseFloat(lon) || null;
    const latitude = parseFloat(lat) || null;
    const wapUrl = `https://uri.amap.com/marker?position=${lon},${lat}&name=${encodeURIComponent(address)}`;
    return {
      address,
      verified: true,
      longitude,
      latitude,
      formatted_address: geo.formatted_address || "",
      wap_url: wapUrl,
    };
  }
  return {
    address,
    verified: false,
    message: "无法在高德地图中找到该地址，地址可能不存在或有误",
  };
}

module.exports = { cmdGeo, cmdRegeo, cmdLocate };
