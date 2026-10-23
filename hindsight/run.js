#!/usr/bin/env node
/**
 * Hindsight MCP 客户端
 *
 * 把 Hindsight 暴露的 MCP 工具封装成零依赖 CLI，命令名与工具名一一对应。
 *
 * 用法:
 *   node skill.js <command> [args] [options]
 *
 * 命令:
 *   retain              写入一条记忆（异步）
 *   recall              检索相关记忆
 *   list-memories       分页列出记忆
 *   get-memory          查看单条记忆
 *   update-memory       修改单条记忆
 *   invalidate-memory   软作废单条记忆（--restore 恢复）
 *   list-mental-models  列出心智模型
 *   tools               列出服务端工具
 *   call                通用兜底调用
 *
 * 本工具打包为单文件 skill.js，无需安装依赖。
 */

const { SKILL_VERSION, McpClient } = require("./lib/mcp");
const { parseArgs } = require("./lib/parser");
const { resolveConfig } = require("./lib/env");
const { EXIT_CODES, usageError, handleError } = require("./lib/errors");
const output = require("./lib/output");
const cmd = require("./lib/cmd");

const SKILL_DIR = __dirname;
const FORMATS = ["json", "table"];

/**
 * 命令分发表
 */
const COMMANDS = {
  retain: { handler: cmd.cmdRetain },
  recall: { handler: cmd.cmdRecall },
  "list-memories": { handler: cmd.cmdListMemories },
  "get-memory": { handler: cmd.cmdGetMemory },
  "update-memory": { handler: cmd.cmdUpdateMemory },
  "invalidate-memory": { handler: cmd.cmdInvalidateMemory },
  "list-mental-models": { handler: cmd.cmdListMentalModels },
  tools: { handler: cmd.cmdTools },
  call: { handler: cmd.cmdCall },
};

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
Hindsight MCP 客户端 v${SKILL_VERSION}

用法:
  node skill.js <command> [args] [options]

命令:
  retain <内容>                 写入一条记忆（异步）
  recall <查询词>               检索相关记忆
  list-memories                 分页列出记忆
  get-memory <memory_id>        查看单条记忆
  update-memory <memory_id>     修改单条记忆（至少提供一个修改字段）
  invalidate-memory <id>        软作废单条记忆；--restore 恢复
  list-mental-models            列出心智模型
  tools                         列出服务端工具（名称、首行描述、必填参数）
  call <tool>                   通用调用，参数用 --args / --args-file 传入 JSON

写入约定:
  retain 为异步写入，本 skill 只提供该写入命令，不提供同步写入 sync-retain。
  retain 返回 accepted 仅表示受理，落库与可检索存在延迟。

retain 选项:
  --context <文本>              记忆上下文（默认 general）
  --timestamp <时间>            记忆发生时间（ISO 8601）
  --tags <a,b>                  标签，逗号分隔
  --metadata <JSON>             元数据对象
  --document-id <id>            关联的文档 ID
  --strategy <名称>             写入策略
  --update-mode <模式>          更新模式（仅 retain）
  --content-file <路径>         从文件读取内容；- 表示标准输入

recall 选项:
  --max-tokens <n>              返回内容 token 上限（默认 4096）
  --budget <级别>               检索预算（默认 high）
  --types <a,b>                 记忆类型：world / experience / observation
  --prefer-observations         优先返回 observation
  --tags <a,b>                  标签过滤
  --tags-match <模式>           any | all | any_strict | all_strict | exact（默认 any）
  --tag-groups <JSON>           标签组过滤
  --query-timestamp <时间>      查询时间点（ISO 8601）
  --min-scores <JSON>           各维度最低分
  --temporal-window <JSON>      时间窗口

list-memories 选项:
  --type <类型>                 world | experience | observation
  -q, --query <关键字>          按关键字过滤
  --limit <n>                   条数上限（默认 100）
  --offset <n>                  偏移量（默认 0）
  --tags <a,b>                  标签过滤
  --tags-match <模式>           标签匹配模式

update-memory 选项:
  --text <文本>                 新的记忆文本
  --context <文本>              新的上下文
  --occurred-start <时间>       发生时间起点
  --occurred-end <时间>         发生时间终点
  --fact-type <类型>            事实类型
  --entities <a,b>              实体列表
  --resolve-entities [布尔]     是否解析实体（默认 true）
  --no-resolve-entities         等价于 --resolve-entities false

invalidate-memory 选项:
  --reason <文本>               作废原因
  --restore                     恢复已作废的记忆

list-mental-models 选项:
  --tags <a,b>                  标签过滤
  --limit <n>                   条数上限（默认 100，范围 1~1000）
  --offset <n>                  偏移量（默认 0）

call 选项:
  --args <JSON>                 工具参数（JSON 对象）
  --args-file <路径>            从文件读取参数；- 表示标准输入

通用选项:
  --url <地址>                  覆盖 HINDSIGHT_MCP_URL
  --token <令牌>                覆盖 HINDSIGHT_TOKEN
  --format <json|table>         输出格式（默认 json）
  --dotenv-file <路径>          指定 .env 文件（默认依次查当前目录、skill 目录）
  -h, --help                    显示帮助
  -v, --version                 显示版本

环境变量:
  HINDSIGHT_MCP_URL             完整 MCP 端点 URL（含 /mcp/<bank>，必需）
  HINDSIGHT_TOKEN               访问令牌（必需，自动拼成 Bearer）
  HINDSIGHT_AUTH_HEADER         完整 Authorization 头值（设置后优先于 token）
  HINDSIGHT_TIMEOUT_MS          请求超时毫秒数（默认 60000）
  以上变量可写入本 skill 目录的 .env（参考 .env.example，已被 .gitignore 忽略）。

示例:
  node skill.js retain "用户偏好：回答使用简体中文" --tags preference,language
  node skill.js recall "用户语言偏好" --max-tokens 2048
  node skill.js list-memories --type world --limit 20 --format table
  node skill.js get-memory <memory_id>
  node skill.js update-memory <memory_id> --text "修正后的内容"
  node skill.js invalidate-memory <memory_id> --reason "内容已过时"
  node skill.js invalidate-memory <memory_id> --restore
  node skill.js list-mental-models --limit 10
  node skill.js tools
  node skill.js call recall --args '{"query":"部署拓扑"}'

输出与退出码:
  成功结果输出到 stdout（JSON 或表格），错误以 JSON 输出到 stderr。
  0 成功 | 1 运行时错误 | 2 用法或配置错误
`);
}

/**
 * 显示版本
 */
function showVersion() {
  console.log(`Hindsight MCP 客户端 v${SKILL_VERSION}`);
}

/**
 * 主函数
 * @returns {Promise<number>} 退出码
 */
async function main() {
  const argv = process.argv.slice(2);
  const { command: rawCommand, positionals, options, unknown } = parseArgs(argv);

  if (options.help || argv.length === 0) {
    showHelp();
    return EXIT_CODES.OK;
  }

  if (options.version) {
    showVersion();
    return EXIT_CODES.OK;
  }

  if (unknown.length) {
    throw usageError(
      `未知选项：${unknown.join(", ")}`,
      "可用 --help 查看支持的选项；选项名使用连字符写法，如 --max-tokens"
    );
  }

  if (!rawCommand) {
    showHelp();
    return EXIT_CODES.OK;
  }

  // 命令名兼容下划线写法：list_memories 等价于 list-memories
  const commandName = String(rawCommand).toLowerCase().replace(/_/g, "-");
  const command = COMMANDS[commandName];
  if (!command) {
    throw usageError(
      `未知命令：${rawCommand}`,
      `可用命令：${Object.keys(COMMANDS).join(" / ")}（执行 --help 查看详细用法）`
    );
  }

  const format = String(options.format === undefined ? "json" : options.format).toLowerCase();
  if (!FORMATS.includes(format)) {
    throw usageError(`--format 取值非法：${options.format}（可选 ${FORMATS.join(" / ")}）`);
  }

  const config = resolveConfig(options, { skillDir: SKILL_DIR });
  const client = new McpClient(config);

  try {
    const result = await command.handler(positionals, options, {
      client,
      config,
      format,
      skillDir: SKILL_DIR,
    });
    output(result, format);
    return EXIT_CODES.OK;
  } finally {
    await client.close();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.exitCode = handleError(error);
  });
