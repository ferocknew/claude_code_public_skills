/**
 * fetch 命令：调用 DeepSeek Fetch 接口抓取单个网页（返回 Markdown 正文）
 *
 * node skill.js fetch <url> [--raw] [--out <file>] [--format table|json|markdown] [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const { fetchPage } = require("../api");
const { makeError, printError, EXIT_CODES } = require("../errors");
const { formatResults, renderFetchResult } = require("../output");

const URL_MAX_LENGTH = 8192;

/**
 * 校验目标 URL（必须是含 host 的 HTTP/HTTPS 地址）
 * @param {string} url
 * @returns {{ok:true}|{ok:false,message:string}}
 */
function validateUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return { ok: false, message: "fetch 命令需要 URL：node skill.js fetch \"https://example.com/article\"" };
  }
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, message: "URL 必须以 http:// 或 https:// 开头" };
  }
  if (trimmed.length > URL_MAX_LENGTH) {
    return { ok: false, message: `URL 长度不能超过 ${URL_MAX_LENGTH} 个字符（当前 ${trimmed.length}）` };
  }
  return { ok: true };
}

/**
 * @param {string[]} positionals
 * @param {object} opts
 * @param {{apiKey:string,baseUrl:string,timeoutMs:number,format:string,json:boolean}} ctx
 * @returns {Promise<number>} 退出码
 */
async function cmdFetch(positionals, opts, ctx) {
  const options = opts || {};
  const context = ctx || {};
  const rawUrl = (positionals || [])[0];

  const check = validateUrl(rawUrl);
  if (!check.ok) {
    printError(makeError("参数错误", check.message));
    return EXIT_CODES.USAGE;
  }
  const url = String(rawUrl).trim();

  // 预览模式：只打印将要发送的请求，绝不发请求，也绝不打印 key
  if (options.dryRun) {
    console.log(
      JSON.stringify(
        { dry_run: true, url: `${context.baseUrl}/v1/tools/fetch`, body: { url } },
        null,
        2
      )
    );
    return EXIT_CODES.OK;
  }

  const res = await fetchPage(url, {
    apiKey: context.apiKey,
    baseUrl: context.baseUrl,
    timeoutMs: context.timeoutMs,
  });

  if (!res.ok) {
    printError({ error: res.error, message: res.message });
    return EXIT_CODES.API;
  }

  // --out：写入文件
  if (options.out) {
    const outPath = path.resolve(String(options.out));
    try {
      fs.writeFileSync(outPath, renderFetchResult(res.data, { raw: true }), "utf8");
    } catch (e) {
      printError(makeError("写入失败", `无法写入 ${outPath}：${e.message}`));
      return EXIT_CODES.API;
    }
    const bytes = fs.statSync(outPath).size;
    console.log(JSON.stringify({ saved: outPath, bytes }, null, 2));
    return EXIT_CODES.OK;
  }

  if (options.json || context.format === "json") {
    console.log(formatResults(res.data, { format: "json" }));
    return EXIT_CODES.OK;
  }

  console.log(renderFetchResult(res.data, { raw: Boolean(options.raw) }));
  return EXIT_CODES.OK;
}

module.exports = { cmdFetch, validateUrl };
