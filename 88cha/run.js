#!/usr/bin/env node

const { parseArgs } = require("./lib/cli");
const { searchCompanies, deepSearch, searchByPerson, searchPatent } = require("./lib/search");
const { formatResults, formatStreamResults, formatPersonResults, formatPatentResults } = require("./lib/format");

async function main() {
  const params = parseArgs();

  if (!params.keyword) {
    console.error("错误：请提供搜索关键词");
    console.log("用法: node skill.js <关键词>");
    process.exit(1);
  }

  if (!params.cookie) {
    console.log("(自动获取 Token...)\n");
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("88查企业搜索");
  console.log(`${"=".repeat(60)}\n`);

  try {
    if (params.person) {
      console.log(`人名查企业: "${params.keyword}" (第${params.page}页)\n`);
      const result = await searchByPerson(params.keyword, params.cookie, params.page, params.pageSize);
      console.log(formatPersonResults(result, params.keyword, params.raw));
    } else if (params.patent) {
      console.log(`专利搜索: "${params.keyword}" (第${params.page}页)\n`);
      const result = await searchPatent(params.keyword, params.cookie, params.page, params.pageSize);
      console.log(formatPatentResults(result, params.keyword, params.raw));
    } else if (params.stream) {
      console.log(`深度搜索: "${params.keyword}"\n`);
      const events = await deepSearch(params.keyword, params.cookie);
      console.log(formatStreamResults(events, params.keyword, params.raw));
    } else {
      console.log(`企业搜索: "${params.keyword}" (第${params.page}页)\n`);
      const result = await searchCompanies(params.keyword, params.cookie, params.page, params.pageSize);
      console.log(formatResults(result, params.keyword, params.raw));
    }
  } catch (e) {
    console.error(`搜索失败: ${e.message}`);
    if (e.message.includes("_m_h5_tk") || e.message.includes("Cookie")) {
        console.log("\n请重新获取 Cookie：");
        console.log("1. 打开 https://88cha.com/");
        console.log("2. 登录账户");
        console.log("3. F12 → Network → 任意请求 → Headers → 复制完整 Cookie 值");
      }
    process.exit(1);
  }

  console.log(`${"=".repeat(60)}`);
  console.log("完成！");
  console.log(`${"=".repeat(60)}\n`);
}

main();
