#!/usr/bin/env node

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// dper 持久化文件
const DPER_FILE = path.join(__dirname, ".dper");

function loadDper() {
  try {
    return fs.readFileSync(DPER_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

function saveDper(token) {
  fs.writeFileSync(DPER_FILE, token, "utf8");
}

// 分类映射
const CATEGORIES = {
  全部: 0, 美食: 10, 电影演出赛事: 25, 休闲娱乐: 30,
  酒店: 60, K歌: 15, 丽人: 50, 运动健身: 45, 景点: 35,
};

// 城市ID映射（常用城市）
const CITIES = {
  上海: 1, 北京: 2, 广州: 4, 深圳: 7, 杭州: 3,
  成都: 8, 重庆: 9, 南京: 5, 武汉: 16, 天津: 10,
  西安: 17, 长沙: 34, 苏州: 6, 郑州: 160, 青岛: 23,
  大连: 19, 厦门: 22, 合肥: 127, 昆明: 28, 福州: 21,
};

// 频率限制：两次搜索间隔至少5秒
let lastRequestTime = 0;
const MIN_INTERVAL = 5000;

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const params = { keyword: "", dper: "", city: "上海", category: "全部" };

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--dper" || args[i] === "-d") && args[i + 1]) {
      params.dper = args[++i];
    } else if ((args[i] === "--city" || args[i] === "-c") && args[i + 1]) {
      params.city = args[++i];
    } else if ((args[i] === "--category" || args[i] === "-t") && args[i + 1]) {
      params.category = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      printHelp();
      process.exit(0);
    } else if (!args[i].startsWith("-") && !params.keyword) {
      params.keyword = args[i];
    }
  }

  // 优先级：CLI 参数 > 环境变量 > 已保存文件
  if (!params.dper && process.env.DIANPING_DPER) {
    params.dper = process.env.DIANPING_DPER;
  }
  if (!params.dper) {
    params.dper = loadDper();
  }

  // 通过 CLI 传入时自动保存
  if (args.some((a, i) => (a === "--dper" || a === "-d") && args[i + 1])) {
    saveDper(params.dper);
  }

  return params;
}

function printHelp() {
  console.log(`大众点评搜索工具 v${__VERSION}

用法: node skill.js <关键词> [选项]

选项:
  --dper, -d <token>    大众点评 dper cookie 值（首次传入后自动保存，后续无需再传）
  --city, -c <城市>     搜索城市（默认: 上海）
  --category, -t <分类> 搜索分类（默认: 全部）

分类: 全部 美食 电影演出赛事 休闲娱乐 酒店 K歌 丽人 运动健身 景点

城市: 上海 北京 广州 深圳 杭州 成都 重庆 南京 武汉 天津 西安 长沙 苏州 等

示例:
  node skill.js "五角场" --dper YOUR_DPER_TOKEN   # 首次使用，自动保存 dper
  node skill.js "火锅" --city 成都                # 后续直接使用
  node skill.js "星巴克"                          # 直接搜索
`);
}

// 频率限制
async function enforceRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL) {
    const wait = MIN_INTERVAL - elapsed;
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
}

// HTTP 请求
function fetchPage(url, headers) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchPage(res.headers.location, headers));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = "";
      res.setEncoding("utf-8");
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// 解析星级：star_50=满星, star_40=4/5, star_30=3/5 等
function parseStars($, commentEl) {
  const stars = $(commentEl).find(".star_icon .star");
  let total = 0;
  let count = 0;
  stars.each(function () {
    const cls = $(this).attr("class") || "";
    const match = cls.match(/star_(\d+)/);
    if (match) {
      total += parseInt(match[1], 10);
      count++;
    }
  });
  if (count === 0) return "";
  // star_50 表示满星(1分), star_40 表示 0.8 分, 以此类推
  const score = (total / (count * 50) * 5).toFixed(1);
  return score;
}

// 用 cheerio (jQuery 选择器) 解析搜索结果
function parseResults(html) {
  const $ = cheerio.load(html);
  const results = [];

  $("#shop-all-list > ul > li").each(function () {
    const li = $(this);

    // 店名和链接
    const titleLink = li.find(".txt .tit a[data-click-name='shop_title_click']");
    const name = titleLink.attr("title") || titleLink.find("h4").text().trim();
    const href = titleLink.attr("href") || "";
    const shopId = titleLink.attr("data-shopid") || "";

    // 从 .comment 下提取信息
    const comment = li.find(".txt .comment");
    const rating = parseStars($, comment);
    const reviewNum = comment.find(".review-num b").text().trim();
    const avgPrice = comment.find(".mean-price b").text().trim();

    // 分类和区域
    const tags = li.find(".txt .tag-addr .tag");
    const category = tags.eq(0).text().trim();
    const region = tags.eq(1).text().trim();

    // 是否有分店
    const hasBranch = li.find(".shop-branch").length > 0;

    results.push({
      name,
      shopId,
      href,
      rating,
      reviewNum,
      avgPrice,
      category,
      region,
      hasBranch,
    });
  });

  return results;
}

// 格式化输出
function formatResults(results, keyword, city) {
  if (results.length === 0) {
    return `[DPER_EXPIRED] 在${city}搜索"${keyword}"未找到结果。\ndper cookie 可能已过期，请使用者重新获取并提供新的 dper 值。\n获取方法：打开 https://www.dianping.com/ 登录后，从浏览器 Cookie 中复制 dper 的值。`;
  }

  let output = `搜索: ${city} - "${keyword}" (共 ${results.length} 条)\n${"=".repeat(50)}\n\n`;

  results.forEach((shop, i) => {
    output += `${i + 1}. ${shop.name}`;
    if (shop.hasBranch) output += " (连锁)";
    output += "\n";

    if (shop.rating) output += `   评分: ${shop.rating}`;
    if (shop.reviewNum) output += `  评价: ${shop.reviewNum}条`;
    if (shop.avgPrice) output += `  人均: ${shop.avgPrice}`;
    output += "\n";

    if (shop.category) output += `   分类: ${shop.category}`;
    if (shop.region) output += `  区域: ${shop.region}`;
    output += "\n";

    if (shop.shopId) output += `   https://www.dianping.com/shop/${shop.shopId}`;
    output += "\n\n";
  });

  return output;
}

// 主流程
async function main() {
  const params = parseArgs();

  if (!params.keyword) {
    console.error("错误：请提供搜索关键词");
    console.log("用法: node skill.js <关键词> --dper <token>");
    process.exit(1);
  }

  if (!params.dper) {
    console.error("错误：请提供 dper cookie 值");
    console.log("方式1: node skill.js 关键词 --dper YOUR_DPER_TOKEN（首次传入后自动保存）");
    console.log("方式2: 设置环境变量 DIANPING_DPER");
    process.exit(1);
  }

  const cityId = CITIES[params.city] || 1;
  const categoryId = CATEGORIES[params.category];
  if (categoryId === undefined) {
    console.error(`错误：不支持的分类 "${params.category}"`);
    console.log(`支持: ${Object.keys(CATEGORIES).join(" ")}`);
    process.exit(1);
  }

  const keyword = encodeURIComponent(params.keyword);
  const url = `https://www.dianping.com/search/keyword/${cityId}/${categoryId}_${keyword}`;

  const headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Cookie": `dper=${params.dper}`,
    "Pragma": "no-cache",
    "Referer": "https://m.dianping.com/",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-site",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  };

  try {
    await enforceRateLimit();
    const html = await fetchPage(url, headers);
    const results = parseResults(html);
    console.log(formatResults(results, params.keyword, params.city));
  } catch (e) {
    console.error(`搜索失败: ${e.message}`);
    if (e.message.includes("302") || e.message.includes("301")) {
      console.log("\n[DPER_EXPIRED] dper cookie 已过期，请使用者重新获取并提供新的 dper 值。");
      console.log("获取方法：打开 https://www.dianping.com/ 登录后，从浏览器 Cookie 中复制 dper 的值。");
    }
    process.exit(1);
  }
}

main();
