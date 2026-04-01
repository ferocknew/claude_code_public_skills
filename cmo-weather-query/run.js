#!/usr/bin/env node

/**
 * 中央气象台天气信息查询工具
 * CMO Weather Query Skill
 *
 * API 接口:
 * 1. 全国城市列表: /dataservice/weather/map/ALL/day1.json
 *    返回索引: 0=城市名, 6=白天天气, 8=温度, 11=夜间天气, 13=夜温, 16=省份代码, 17=城市混淆码, 18=URL
 * 2. 详细天气: /rest/weather?stationid={城市混淆码}
 *    返回: real(实况), predict(7天预报), passedchart(过去24h逐时), tempchart(14天温度)
 * 3. 省份城市: /rest/province/{省份代码}
 */

const SKILL_VERSION = process.env.SKILL_VERSION || 'dev';

const NMC_BASE = 'https://www.nmc.cn';
const ALL_API = `${NMC_BASE}/dataservice/weather/map/ALL/day1.json`;
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const CITIES_FILE = path.join(__dirname, 'city_code.json');

const args = process.argv.slice(2);

// ─── 网络请求 ───

const HEADERS = {
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Referer': 'https://www.nmc.cn/publish/forecast.html',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
};

async function httpGet(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // 统一接口格式：部分接口返回 { code, data }，部分直接返回数组
  if (Array.isArray(json)) return json;
  if (json.code !== 0) throw new Error(json.msg || 'API 返回错误');
  return json.data;
}

// ─── 城市缓存 ───

function loadCitiesCache() {
  try {
    if (fs.existsSync(CITIES_FILE)) {
      return JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8'));
    }
  } catch {}
  return null;
}

function saveCitiesCache(data) {
  fs.writeFileSync(CITIES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 将层级缓存展开为扁平城市 map（用于查找）
 */
function flattenCityMap(provinceMap) {
  const flat = {};
  for (const [provCode, prov] of Object.entries(provinceMap)) {
    for (const [cityName, cityInfo] of Object.entries(prov.cities)) {
      flat[cityName] = { ...cityInfo, province: prov.name, provinceCode: provCode };
    }
  }
  return flat;
}

/**
 * 同步所有城市到本地缓存
 * 层级结构: { "ABJ": { "name": "北京市", "cities": { "北京": { code, url }, ... } }, ... }
 */
async function syncCities() {
  console.log('正在同步城市数据...\n');

  const provinces = await httpGet(`${NMC_BASE}/rest/province/all`);
  console.log(`获取到 ${provinces.length} 个省份\n`);

  const provinceMap = {};

  for (const prov of provinces) {
    try {
      const cities = await httpGet(`${NMC_BASE}/rest/province/${prov.code}`);
      const cityMap = {};
      for (const c of cities) {
        cityMap[c.city] = { code: c.code, url: c.url };
      }
      provinceMap[prov.code] = { name: prov.name, cities: cityMap };

      const shortName = prov.name.replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, '');
      console.log(`  ✓ ${shortName.padEnd(6)} ${cities.length} 个城市`);
    } catch (e) {
      console.log(`  ✗ ${prov.name} 获取失败: ${e.message}`);
    }
  }

  saveCitiesCache(provinceMap);
  const total = Object.values(provinceMap).reduce((sum, p) => sum + Object.keys(p.cities).length, 0);
  console.log(`\n✅ 同步完成！共 ${total} 个城市，已保存到 city_code.json\n`);
  return provinceMap;
}

/**
 * 获取扁平城市 map（优先读取缓存）
 */
async function getCityMap() {
  let cache = loadCitiesCache();
  if (cache) return flattenCityMap(cache);

  console.log('未找到城市缓存，正在自动同步...\n');
  const provinceMap = await syncCities();
  return flattenCityMap(provinceMap);
}

/**
 * 在城市缓存中查找（模糊匹配）
 */
function findCityInCache(cityMap, name) {
  // 精确匹配
  if (cityMap[name]) return { name, ...cityMap[name] };

  // 模糊匹配
  for (const [city, info] of Object.entries(cityMap)) {
    if (city.includes(name) || name.includes(city)) {
      return { name: city, ...info };
    }
  }

  return null;
}

// ─── 全国天气概览（快速查询，不需要城市缓存） ───

async function fetchAllCities() {
  return httpGet(ALL_API);
}

// ─── 详细天气 ───

async function fetchDetail(code) {
  return httpGet(`${NMC_BASE}/rest/weather?stationid=${code}`);
}

// ─── 省份城市列表 ───

async function fetchProvinceCities(provinceCode) {
  return httpGet(`${NMC_BASE}/rest/province/${provinceCode}`);
}

// ─── HTML 分时预报解析 ───

async function fetchHourlyForecast(cityUrl) {
  const res = await fetch(`${NMC_BASE}${cityUrl}`, { headers: HEADERS });
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);

  const hours = [];
  $('#hourValues .hour3').each((_, el) => {
    const $divs = $(el).children('div').not('.hourimg').not('.hide');
    const texts = [];
    $divs.each((_, d) => {
      const t = $(d).text().trim();
      if (t) texts.push(t);
    });

    if (texts.length >= 5) {
      hours.push({
        time: texts[0],
        rain: texts[1] === '-' ? null : texts[1],
        temp: texts[2],
        windSpeed: texts[3],
        windDir: texts[4],
        humidity: texts[5] || '-',
      });
    }
  });

  return hours.length > 0 ? hours : null;
}

function displayHourlyForecast(hours) {
  if (!hours || hours.length === 0) return;

  console.log(`\n🔮 未来 7 天逐 3 小时预报`);
  console.log('─'.repeat(75));
  console.log('  时间              温度    湿度    风速     风向      降水');
  console.log('─'.repeat(75));

  let lastDate = '';
  for (const h of hours) {
    // 日期分隔
    const datePart = h.time.match(/(\d{2}日|\d{2}\/\d{2})/);
    if (datePart && datePart[1] !== lastDate) {
      if (lastDate) console.log('  ' + '·'.repeat(40));
      lastDate = datePart[1];
    }

    const temp = h.temp || '-';
    const hum = h.humidity || '-';
    const ws = h.windSpeed || '-';
    const wd = h.windDir || '-';
    const rain = h.rain || '-';

    console.log(
      `  ${h.time.padEnd(18)}${temp.padStart(8)}  ${hum.padStart(6)}  ${ws.padStart(8)}  ${wd.padStart(6)}  ${rain.padStart(8)}`
    );
  }
  console.log('');
}

// ─── 风向角度转文字 ───

function windDegreeToName(deg) {
  if (deg == null || deg === 9999) return '-';
  const dirs = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  return dirs[Math.round(deg / 45) % 8];
}

// ─── 显示函数 ───

function displayReal(real) {
  const s = real.station;
  const w = real.weather;
  const wind = real.wind;
  const sun = real.sunriseSunset;

  console.log(`\n📍 ${s.province} ${s.city}`);
  console.log(`🕐 发布时间: ${real.publish_time}`);
  console.log('─'.repeat(50));
  console.log(`🌤️  天气: ${w.info}  体感 ${w.feelst}℃`);
  console.log(`🌡️  温度: ${w.temperature}℃  湿度: ${w.humidity}%`);
  console.log(`💨 风: ${wind.direct} ${wind.power}  风速 ${wind.speed}m/s`);
  if (w.airpressure && w.airpressure !== 9999) {
    console.log(`📊 气压: ${w.airpressure}hPa`);
  }
  if (sun && sun.sunrise) {
    const sr = sun.sunrise.split(' ')[1];
    const ss = sun.sunset ? sun.sunset.split(' ')[1] : '-';
    console.log(`🌅 日出: ${sr}  🌇 日落: ${ss}`);
  }
}

function displayForecast(predict) {
  const details = predict.detail;
  console.log(`\n📅 ${predict.publish_time} 发布 7 天预报`);
  console.log('─'.repeat(70));
  console.log('  日期       白天天气  温度   风力      夜间天气  温度   风力');
  console.log('─'.repeat(70));

  for (const d of details) {
    const date = d.date.slice(5);
    console.log(
      `  ${date}    ` +
      `${d.day.weather.info.padEnd(6)}  ${String(d.day.weather.temperature).padStart(3)}℃  ` +
      `${(d.day.wind.direct + ' ' + d.day.wind.power).padEnd(10)}  ` +
      `${d.night.weather.info.padEnd(6)}  ${String(d.night.weather.temperature).padStart(3)}℃  ` +
      `${d.night.wind.direct} ${d.night.wind.power}`
    );
  }
  console.log('');
}

function displayHourly(passedchart) {
  if (!passedchart || passedchart.length === 0) return;

  console.log(`\n⏱️  过去 24 小时实况`);
  console.log('─'.repeat(70));
  console.log('  时间              温度    湿度    风速     风向      降水');
  console.log('─'.repeat(70));

  // 数据是倒序的（最新在前），反转为正序
  const items = [...passedchart].reverse();
  for (const h of items) {
    const time = h.time.slice(5); // MM-DD HH:MM
    const temp = h.temperature != null ? `${h.temperature}℃` : '-';
    const hum = h.humidity != null ? `${h.humidity}%` : '-';
    const ws = h.windSpeed != null ? `${h.windSpeed}m/s` : '-';
    const wd = windDegreeToName(h.windDirection);
    const rain = h.rain1h != null && h.rain1h !== 9999 ? `${h.rain1h}mm` : '-';

    console.log(
      `  ${time.padEnd(18)}${temp.padStart(6)}  ${hum.padStart(6)}  ${ws.padStart(8)}  ${wd.padStart(6)}  ${rain.padStart(8)}`
    );
  }
  console.log('');
}

function displayProvinceCities(cities) {
  if (!cities || cities.length === 0) {
    console.log('未找到城市');
    return;
  }

  const province = cities[0].province;
  console.log(`\n📍 ${province} 地区城市列表\n`);
  for (const c of cities) {
    console.log(`  ${c.city.padEnd(8)} ${c.url}`);
  }
  console.log(`\n共 ${cities.length} 个城市\n`);
}

// ─── 列出城市 ───

function listAllCities(data, limit = 30) {
  console.log(`\n📍 城市列表 (前 ${limit} 个，共 ${data.length} 个):\n`);
  for (const city of data.slice(0, limit)) {
    console.log(`  ${city[0].padEnd(12)} ${city[6]} ${city[8]}°C / ${city[11]} ${city[13]}°C  [${city[16]}]`);
  }
  console.log('');
}

// ─── 帮助 ───

function showHelp() {
  console.log(`
中央气象台天气信息查询工具 v${SKILL_VERSION}

使用方法:
  node skill.js <城市名>             查询实时天气 + 7天预报 + 24h实况
  node skill.js <城市名> --real      仅显示实时天气
  node skill.js <城市名> --forecast  仅显示7天预报
  node skill.js <城市名> --hourly    仅显示24h逐时实况
  node skill.js <省份名> --province  查看省份下所有城市
  node skill.js --sync               同步城市数据到本地缓存
  node skill.js --list               列出城市(带天气)
  node skill.js --help               显示帮助

示例:
  node skill.js 徐家汇
  node skill.js 北京 --forecast
  node skill.js 上海 --province
  node skill.js --sync
  node skill.js --list

数据来源: 中央气象台 (nmc.cn)
  `);
}

// ─── 主函数 ───

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`cmo-weather-query v${SKILL_VERSION}`);
    process.exit(0);
  }

  // 同步城市缓存
  if (args.includes('--sync')) {
    await syncCities();
    process.exit(0);
  }

  // 列出城市（带天气，使用 ALL 接口）
  if (args.includes('--list')) {
    const allData = await fetchAllCities();
    listAllCities(allData);
    process.exit(0);
  }

  // 查询天气（优先使用城市缓存获取混淆码）
  const cityName = args[0];
  const cityMap = await getCityMap();
  const city = findCityInCache(cityMap, cityName);

  if (!city) {
    console.error(`\n❌ 未找到城市: ${cityName}`);
    console.log('提示: 使用 --sync 同步城市数据，或 --list 查看所有城市\n');
    process.exit(1);
  }

  // 省份模式
  if (args.includes('--province')) {
    const cities = await fetchProvinceCities(city.provinceCode);
    displayProvinceCities(cities);
    process.exit(0);
  }

  // 获取详细天气
  const detail = await fetchDetail(city.code);

  // 根据参数选择性显示
  const showReal = args.includes('--real');
  const showForecast = args.includes('--forecast');
  const showHourly = args.includes('--hourly');
  const showAll = !showReal && !showForecast && !showHourly;

  if (showAll || showReal) displayReal(detail.real);
  if (showAll || showForecast) displayForecast(detail.predict);
  if (showAll || showHourly) displayHourly(detail.passedchart);
  if (showAll) {
    const hourlyForecast = await fetchHourlyForecast(city.url);
    displayHourlyForecast(hourlyForecast);
  }
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message);
  process.exit(1);
});
