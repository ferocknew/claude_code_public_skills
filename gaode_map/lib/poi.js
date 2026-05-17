const { amapGet } = require("./api");

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

async function cmdAround2(opts) {
  const location = opts.location;
  if (!location) {
    return { error: "参数错误", message: "around2 命令需要 --location 参数（格式：经度,纬度）" };
  }
  const params = {
    keywords: opts.keywords || undefined,
    location,
    radius: Math.min(parseInt(opts.radius) || 1000, 50000),
    types: opts.types || undefined,
    sortrule: opts.sort || undefined,
    region: opts.region || undefined,
    show_fields: opts.fields || undefined,
    page_size: Math.min(parseInt(opts.limit) || 20, 25),
    page_num: opts.page || 1,
  };
  const result = await amapGet("/v5/place/around", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return (result.pois || []).map(parsePoiV5);
  }
  return { error: "周边搜索2.0失败", message: result.info || "未知错误" };
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
    distance: poi.distance || "",
  };
}

async function cmdSearch2(opts) {
  const params = {
    keywords: opts.keywords || undefined,
    types: opts.types || undefined,
    region: opts.region || undefined,
    city_limit: opts.city_limit || undefined,
    show_fields: opts.fields || undefined,
    page_size: Math.min(parseInt(opts.limit) || 20, 25),
    page_num: opts.page || 1,
  };
  const result = await amapGet("/v5/place/text", params);
  if (result.error) return result;
  if (String(result.status) === "1") {
    return (result.pois || []).map(parsePoiV5);
  }
  return { error: "关键词搜索2.0失败", message: result.info || "未知错误" };
}

module.exports = { cmdSearch, cmdAround, cmdAround2, cmdSearch2 };
