/**
 * search 命令：调用 DeepSeek Search 接口搜索网页
 *
 * node skill.js search <关键词...> [--count 10] [--content] [--ori-question "..."]
 *                                 [--localization <IP>] [--format table|json|markdown]
 *                                 [--dry-run] [--stdin]
 *
 * 字段约束（官方文档）：query 1~128 字符，ori_question 1~128 字符。
 * 超限属于用法错误，直接以退出码 2 返回中文提示，不把 400 抛给用户。
 */

const { searchWeb } = require("../api");
const { makeError, printError, EXIT_CODES } = require("../errors");
const { formatResults } = require("../output");

const QUERY_MAX = 128;
const ORI_QUESTION_MAX = 128;

/** 读取 stdin 全文（trim 后返回） */
function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buf += chunk;
    });
    process.stdin.on("end", () => resolve(buf.trim()));
    process.stdin.on("error", () => resolve(buf.trim()));
  });
}

/** 按 Unicode 码点计数（中文按 1 个字符算） */
function charCount(str) {
  return Array.from(String(str)).length;
}

/**
 * 校验关键词长度（run.js 预检与 cmdSearch 复用，单一实现来源）
 * @param {string} query
 * @returns {{error:string,message:string}|null}
 */
function checkQueryLength(query) {
  if (charCount(query) > QUERY_MAX) {
    return makeError(
      "参数错误",
      `搜索关键词过长：${charCount(query)} 个字符，官方限制 1~${QUERY_MAX} 个字符`
    );
  }
  return null;
}

/**
 * 校验 --ori-question 长度
 * @param {string} oriQuestion
 * @returns {{error:string,message:string}|null}
 */
function checkOriQuestion(oriQuestion) {
  if (oriQuestion && charCount(oriQuestion) > ORI_QUESTION_MAX) {
    return makeError(
      "参数错误",
      `--ori-question 过长：${charCount(oriQuestion)} 个字符，官方限制 1~${ORI_QUESTION_MAX} 个字符`
    );
  }
  return null;
}

/**
 * @param {string[]} positionals 关键词（多段以空格拼接）
 * @param {object} opts 解析后的选项
 * @param {{apiKey:string,baseUrl:string,timeoutMs:number,format:string,count:number,json:boolean}} ctx
 * @returns {Promise<number>} 退出码
 */
async function cmdSearch(positionals, opts, ctx) {
  const options = opts || {};
  const context = ctx || {};

  let query = (positionals || []).join(" ").trim();
  if (!query && options.stdin) query = await readStdin();

  if (!query) {
    printError(
      makeError(
        "参数错误",
        "search 命令需要关键词：node skill.js search \"关键词\"（或使用 --stdin 从标准输入读取）"
      )
    );
    return EXIT_CODES.USAGE;
  }

  const tooLong = checkQueryLength(query);
  if (tooLong) {
    printError(tooLong);
    return EXIT_CODES.USAGE;
  }

  const oriQuestion =
    typeof options.oriQuestion === "string" && options.oriQuestion.trim()
      ? options.oriQuestion.trim()
      : null;
  const oriTooLong = checkOriQuestion(oriQuestion);
  if (oriTooLong) {
    printError(oriTooLong);
    return EXIT_CODES.USAGE;
  }

  const localization =
    typeof options.localization === "string" && options.localization.trim()
      ? options.localization.trim()
      : null;

  const count = context.count || 10;
  const body = { query, count };
  body.need_content = Boolean(options.content);
  if (oriQuestion) body.ori_question = oriQuestion;
  if (localization) body.localization = localization;

  const url = `${context.baseUrl}/v1/tools/search`;

  // 预览模式：只打印将要发送的请求，绝不发请求，也绝不打印 key
  if (options.dryRun) {
    console.log(JSON.stringify({ dry_run: true, url, body }, null, 2));
    return EXIT_CODES.OK;
  }

  const res = await searchWeb(query, {
    apiKey: context.apiKey,
    baseUrl: context.baseUrl,
    timeoutMs: context.timeoutMs,
    count,
    oriQuestion,
    localization,
    needContent: Boolean(options.content),
  });

  if (!res.ok) {
    printError({ error: res.error, message: res.message });
    return EXIT_CODES.API;
  }

  const results = Array.isArray(res.data && res.data.results) ? res.data.results : [];

  // 空结果不计费：给出结构化提示而不是空表格
  if (!results.length) {
    console.log(
      JSON.stringify(
        { query, count: 0, results: [], message: "没有找到匹配结果（空结果不计费）" },
        null,
        2
      )
    );
    return EXIT_CODES.OK;
  }

  const format = context.format || "table";
  if (format === "json") {
    // 原样输出接口响应，不注入 query 等额外字段
    console.log(formatResults(res.data, { format }));
  } else {
    console.log(
      formatResults(Object.assign({}, res.data, { query }), {
        format,
        wantContent: Boolean(options.content),
      })
    );
  }
  return EXIT_CODES.OK;
}

module.exports = { cmdSearch, checkQueryLength, checkOriQuestion, charCount, QUERY_MAX, ORI_QUESTION_MAX };
