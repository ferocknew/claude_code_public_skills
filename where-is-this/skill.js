#!/usr/bin/env node
// Where Is This Skill v260401
// 逆地理编码工具


// run.js
var SKILL_VERSION = process.env.SKILL_VERSION || "dev";
var API_URL = "https://map.jiqrxx.com/getJson/search22.php";
var args = process.argv.slice(2);
var HEADERS = {
  "accept": "*/*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  "cache-control": "no-cache",
  "content-type": "application/x-www-form-urlencoded",
  "origin": "https://map.jiqrxx.com",
  "pragma": "no-cache",
  "referer": "https://map.jiqrxx.com/jingweidu/",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
};
function showHelp() {
  console.log(`
\u9006\u5730\u7406\u7F16\u7801\u5DE5\u5177 v${SKILL_VERSION}

\u4F7F\u7528\u65B9\u6CD5:
  node skill.js <\u7EAC\u5EA6> <\u7ECF\u5EA6>

\u793A\u4F8B:
  node skill.js 39.9072 116.3913
  node skill.js 39.9042 116.4074
  `);
}
async function reverseGeocode(lat, lng) {
  const body = `address=${encodeURIComponent(lat + "," + lng)}&type=LatLng`;
  const res = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 0) {
    throw new Error(`\u67E5\u8BE2\u5931\u8D25: status ${json.status}`);
  }
  return json.result;
}
async function main() {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`where-is-this v${SKILL_VERSION}`);
    process.exit(0);
  }
  const lat = args[0];
  const lng = args[1];
  if (!lat || !lng) {
    console.error("\u8BF7\u63D0\u4F9B\u7EAC\u5EA6\u548C\u7ECF\u5EA6\uFF0C\u4F8B\u5982: node skill.js 39.9072 116.3913");
    process.exit(1);
  }
  const result = await reverseGeocode(lat, lng);
  console.log(`
\u{1F4CD} \u5750\u6807: ${lat}, ${lng}`);
  console.log("\u2500".repeat(50));
  console.log(`\u{1F3E0} \u5730\u5740: ${result.title}`);
  if (result.province)
    console.log(`\u{1F5FA}\uFE0F  \u533A\u57DF: ${result.province}`);
  if (result.city && result.city !== result.province)
    console.log(`\u{1F3D9}\uFE0F  \u57CE\u5E02: ${result.city}`);
  console.log("");
}
main().catch((err) => {
  console.error("\n\u274C \u9519\u8BEF:", err.message);
  process.exit(1);
});
