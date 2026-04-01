#!/usr/bin/env node

/**
 * 逆地理编码工具 - 根据经纬度查询地址
 * Where Is This Skill
 *
 * API: POST https://map.jiqrxx.com/getJson/search22.php
 * 参数: address=纬度,经度&type=LatLng
 */

const SKILL_VERSION = process.env.SKILL_VERSION || 'dev';
const API_URL = 'https://map.jiqrxx.com/getJson/search22.php';

const args = process.argv.slice(2);

const HEADERS = {
  'accept': '*/*',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'cache-control': 'no-cache',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://map.jiqrxx.com',
  'pragma': 'no-cache',
  'referer': 'https://map.jiqrxx.com/jingweidu/',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
};

function showHelp() {
  console.log(`
逆地理编码工具 v${SKILL_VERSION}

使用方法:
  node skill.js <纬度> <经度>

示例:
  node skill.js 39.9072 116.3913
  node skill.js 39.9042 116.4074
  `);
}

async function reverseGeocode(lat, lng) {
  const body = `address=${encodeURIComponent(lat + ',' + lng)}&type=LatLng`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: HEADERS,
    body,
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  if (json.status !== 0) {
    throw new Error(`查询失败: status ${json.status}`);
  }

  return json.result;
}

async function main() {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`where-is-this v${SKILL_VERSION}`);
    process.exit(0);
  }

  const lat = args[0];
  const lng = args[1];

  if (!lat || !lng) {
    console.error('请提供纬度和经度，例如: node skill.js 39.9072 116.3913');
    process.exit(1);
  }

  const result = await reverseGeocode(lat, lng);

  console.log(`\n📍 坐标: ${lat}, ${lng}`);
  console.log('─'.repeat(50));
  console.log(`🏠 地址: ${result.title}`);
  if (result.province) console.log(`🗺️  区域: ${result.province}`);
  if (result.city && result.city !== result.province) console.log(`🏙️  城市: ${result.city}`);
  console.log('');
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message);
  process.exit(1);
});
