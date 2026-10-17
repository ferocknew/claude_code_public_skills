#!/usr/bin/env node
/**
 * DeepSeek 网页搜索与抓取工具
 *
 * 文档: https://api-docs.deepseek.com/zh-cn/guides/search
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   search   网页搜索（Search API）
 *   fetch    抓取单个网页，返回 Markdown 正文（Fetch API）
 *   config   查看 / 写入本地配置（无需 API Key）
 *
 * 安全约定:
 *   API Key 只从环境变量、--api-key 或 .env 读取，绝不硬编码、绝不打印到 stdout。
 */

const path = require("path");
const {
  SKILL_VERSION,
  BASE_URL,
  loadDotEnv,
  getBaseUrl,
  getTimeoutMs,
  saveApiKeyToFile,
  missingKeyError,
} = require("./lib/api");
const { resolveApiKey, getEnvFilePath, askForApiKey } = require("./lib/env");
const { parseArgs, validateCommonOpts, toInt } = require("./lib/cli");
const { makeError, printError, EXIT_CODES } = require("./lib/errors");
const { cmdSearch, cmdFetch, cmdConfig } = require("./lib/cmd");
// 参数预检：用法错误必须在「检查 / 询问 API Key」之前报出，退出码才是 2
const { checkQueryLength, checkOriQuestion } = require("./lib/cmd/search");
const { validateUrl } = require("./lib/cmd/fetch");

const SKILL_DIR = __dirname;

// 提前加载 skill 目录下的 .env（环境变量优先级更高，不会被覆盖）
loadDotEnv(SKILL_DIR);

function showHelp() {
  console.log(`
DeepSeek 网页搜索与抓取工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [args] [options]

  注意：查询词 / URL 必须紧跟在命令之后，选项放在其后。
    ✓ node skill.js search "关键词" --count 5
    ✗ node skill.js --count 5 "关键词"

命令:
  search <关键词>              网页搜索，返回标题 / 链接 / 摘要 / 相关分
  fetch <url>                  抓取单个网页，返回 Markdown 正文
  config [show|path|set-key]   查看配置 / 输出 .env 路径 / 写入 API Key（无需 Key）

选项:
  --api-key, -k <key>          单次传入 API Key（不落盘）
  --env-file <path>            指定 .env 文件路径（默认 <skillDir>/.env）
                               注意：Node 20.6+ 也会解析 --env-file，文件不存在时 Node 直接以 9 退出
  --dotenv-file <path>         同上，但不与 Node 内置选项冲突（目标文件尚未创建时请用这个）
  --format, -f <fmt>           输出格式：table（默认）/ json / markdown
  --json                       等价于 --format json
  --timeout, -t <ms>           请求超时（默认 30000，回退 DEEPSEEK_TIMEOUT_MS）
  --no-input                   禁止交互式询问（等同于 DEEPSEEK_NO_PROMPT=1）
  --dry-run                    只打印将要发送的请求，不实际调用接口
  --stdin                      从标准输入读取关键词 / Key
  --help, -h                   显示帮助
  --version, -v                显示版本

search 专属选项:
  --count, -n <1-50>           返回条数（默认 10）
  --content                    附带网页正文（need_content=true，正文按 500 字符截断显示）
  --ori-question <文本>        触发搜索的用户原始问题（1~128 字符），帮助理解搜索意图
  --localization <IP>          用于优先返回本地化搜索结果的 IP

fetch 专属选项:
  --raw                        只输出正文，不加标题
  --out, -o <file>             将正文写入文件（输出 { saved, bytes }）

示例:
  node skill.js search "DeepSeek V4 发布" --count 5
  node skill.js search "DeepSeek site:github.com lang:zh after:2025" -n 5 --content
  node skill.js search "模型定价" --format markdown
  echo "量子计算" | node skill.js search --stdin --json
  node skill.js fetch "https://api-docs.deepseek.com/zh-cn/guides/search" --raw
  node skill.js fetch "https://example.com/article" --out article.md
  node skill.js config show
  node skill.js config set-key sk-xxxx
  node skill.js config --env-file ./my.env set-key sk-xxxx

环境变量:
  DEEPSEEK_API_KEY        DeepSeek API Key（必需，请在 .env 或环境变量中配置）
  DEEPSEEK_BASE_URL       接口地址（默认 ${BASE_URL}）
  DEEPSEEK_TIMEOUT_MS     请求超时毫秒数（默认 30000）
  DEEPSEEK_NO_PROMPT      设为 1 时禁止交互式询问 Key（脚本 / CI 场景）

计费与限速:
  - Search 与 Fetch 各自独立限速 5 QPS（按账号计算，与使用哪个 Key 无关），超出返回 429
  - 每 1000 次成功请求 5 元，按请求次数计费，count 不影响单次价格
  - 请求失败、搜索无结果（results 为空）、超时均不计费

首次使用:
  未检测到 API Key 时，交互式终端会主动询问；输入后会保存到
  ${path.join(SKILL_DIR, ".env")}（该文件已被 .gitignore 忽略，不会提交）
`);
}

/**
 * 解析公共上下文（baseUrl / timeoutMs / format / count）
 * @param {object} opts
 * @returns {{ctx:object}|{error:string,message:string}}
 */
function buildContext(opts) {
  const checked = validateCommonOpts(opts);
  if (checked.error) return checked;

  // --timeout 优先，其次 DEEPSEEK_TIMEOUT_MS，最后 30000；必须给出确定值，
  // 否则 api.js 会退回环境变量，导致显式传入的 --timeout 不生效
  let timeoutMs = getTimeoutMs();
  if (opts.timeout !== undefined) {
    const parsed = toInt(opts.timeout, "--timeout", { min: 1 });
    if (typeof parsed !== "number") return parsed;
    timeoutMs = parsed;
  }

  return {
    ctx: {
      baseUrl: getBaseUrl(),
      timeoutMs,
      format: checked.format,
      json: Boolean(opts.json),
      count: checked.count,
      skillDir: SKILL_DIR,
      envFile: opts.envFile,
    },
  };
}

/**
 * 分发前的参数预检（只做与凭据无关的校验）
 * --stdin 的查询词需读取 stdin，留到命令内校验，避免重复消费输入流
 * @returns {{error:string,message:string}|null}
 */
function preflight(command, positionals, opts) {
  const options = opts || {};
  if (command === "search") {
    const query = (positionals || []).join(" ").trim();
    if (!query && !options.stdin) {
      return makeError(
        "参数错误",
        "search 命令需要关键词：node skill.js search \"关键词\"（或使用 --stdin 从标准输入读取）"
      );
    }
    if (query) {
      const bad = checkQueryLength(query);
      if (bad) return bad;
    }
    const oriQuestion =
      typeof options.oriQuestion === "string" && options.oriQuestion.trim()
        ? options.oriQuestion.trim()
        : null;
    return checkOriQuestion(oriQuestion);
  }
  if (command === "fetch") {
    const check = validateUrl((positionals || [])[0]);
    return check.ok ? null : makeError("参数错误", check.message);
  }
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  const { command, positionals, opts } = parseArgs(argv);

  // 1) 帮助 / 版本
  if (opts.help || argv.length === 0) {
    showHelp();
    return EXIT_CODES.OK;
  }
  if (opts.version) {
    console.log(`DeepSeek 网页搜索与抓取工具 v${SKILL_VERSION}`);
    return EXIT_CODES.OK;
  }

  // 2) config：不需要 API Key，也不触发询问
  if (command === "config") {
    return cmdConfig(positionals, opts, { skillDir: SKILL_DIR, envFile: opts.envFile });
  }

  if (command !== "search" && command !== "fetch") {
    showHelp();
    printError(
      makeError("用法错误", `未知命令：${command}（可用命令：search / fetch / config）`)
    );
    return EXIT_CODES.USAGE;
  }

  // 3) 参数预检：用法错误先于凭据检查（退出码 2），并保证 --dry-run 同样被拦住
  const pre = preflight(command, positionals, opts);
  if (pre) {
    printError(pre);
    return EXIT_CODES.USAGE;
  }

  // 4) 解析 API Key
  const resolved = resolveApiKey({ apiKey: opts.apiKey, envFile: opts.envFile, skillDir: SKILL_DIR });

  // 显式传入的 --api-key 非法：直接以用法错误退出，绝不进入交互询问
  if (resolved.invalid) {
    printError(makeError("参数错误", `--api-key 不合法：${resolved.invalid}`));
    return EXIT_CODES.USAGE;
  }

  let apiKey = resolved.apiKey;

  // 缺 Key 且非 --dry-run 时才主动询问
  if (!apiKey && !opts.dryRun) {
    // --stdin 表示查询词要从 stdin 读，若此时再询问 Key 会把管道内容当成 Key 读走，
    // 导致查询词永远读不到。这里直接给出指引并以「缺少 Key」退出。
    if (opts.stdin) {
      printError(
        makeError(
          "API Key 缺失",
          "--stdin 需要用 stdin 传递查询词，无法同时用它输入 API Key。\n\n" +
            "请改用以下任一方式提供 Key 后重试：\n" +
            "  (a) 命令行传入：node skill.js search --stdin --api-key sk-xxxx（或 -k sk-xxxx）；\n" +
            "  (b) 先写入本地配置：node skill.js config set-key sk-xxxx（默认写 .env）；\n" +
            "  (c) 指定配置文件：node skill.js search --stdin --env-file <path>；\n" +
            "  (d) 设置环境变量 DEEPSEEK_API_KEY。"
        )
      );
      return EXIT_CODES.NO_KEY;
    }
    const asked = await askForApiKey({ noInput: Boolean(opts.noInput) });
    if (asked.status === "invalid") {
      printError(makeError("参数错误", `API Key 不合法：${asked.message}`));
      return EXIT_CODES.USAGE;
    }
    if (asked.status === "key") {
      // 写入 --env-file 指定的文件；未指定时写 <skillDir>/.env
      const envFile = getEnvFilePath({ envFile: opts.envFile, skillDir: SKILL_DIR });
      const saved = saveApiKeyToFile(envFile, asked.apiKey);
      console.log(`✓ API Key 已保存到 ${saved.path}（已加入 .gitignore，不会提交）`);
      apiKey = asked.apiKey;
    } else {
      printError(missingKeyError());
      return EXIT_CODES.NO_KEY;
    }
  }

  // 5) 公共选项校验（--count / --format / --timeout），在分发前统一拦截
  const built = buildContext(opts);
  if (built.error) {
    printError({ error: built.error, message: built.message });
    return EXIT_CODES.USAGE;
  }
  const ctx = built.ctx;

  if (command === "search") return cmdSearch(positionals, opts, Object.assign({ apiKey }, ctx));
  return cmdFetch(positionals, opts, Object.assign({ apiKey }, ctx));
}

main()
  .then((code) => {
    process.exitCode = typeof code === "number" ? code : EXIT_CODES.OK;
  })
  .catch((e) => {
    // 兜底：绝不抛出堆栈，也绝不回显任何请求内容
    printError(makeError("内部错误", e && e.message ? e.message : String(e)));
    process.exitCode = EXIT_CODES.API;
  });
