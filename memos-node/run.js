#!/usr/bin/env node
/**
 * Memos REST API 客户端
 *
 * 用法:
 *   node skill.js <对象> <子命令> [参数...] [选项]
 *
 * 对象:
 *   memo         memo 的增删改查、归档、置顶、评论、表情回应、标签
 *   attachment   附件上传/下载/列表/删除
 *   user         实例用户查询与统计
 *   instance     实例信息与存储统计
 *
 * 本工具将依赖打包为单文件，无需 npm install。
 */

const { SKILL_VERSION } = require("./lib/api");
const { parseArgs } = require("./lib/parser");
const { handleError } = require("./lib/errors");
const output = require("./lib/output");
const cmd = require("./lib/cmd");

/**
 * 显示帮助
 */
function showHelp() {
  console.log(`
Memos API 客户端 v${SKILL_VERSION}

用法:
  node skill.js <对象> <子命令> [参数...] [选项]

memo 命令:
  memo list [选项]                    列出 memo（默认按创建时间倒序）
  memo get <uid>                      查看单条 memo
  memo create <内容>                  新建 memo（内容也可用 --content 传入）
  memo update <uid> [选项]            修改内容 / 可见性 / 置顶
  memo delete <uid>                   删除 memo（加 --force 强制删除）
  memo archive <uid>                  归档 memo
  memo restore <uid>                  从归档恢复
  memo pin <uid>                      置顶
  memo unpin <uid>                    取消置顶
  memo comments <uid>                 列出评论
  memo comment <uid> <内容>           添加评论
  memo reactions <uid>                列出表情回应
  memo react <uid> <表情>             添加表情回应（如 👍）
  memo unreact <uid> <id>             删除表情回应
  memo tags [--limit n]               统计当前可见 memo 的标签及数量

attachment 命令:
  attachment list [选项]              列出附件
  attachment get <uid>                查看附件元信息
  attachment upload <本地文件>        上传文件（--memo <uid> 可关联到 memo）
  attachment download <uid>           下载附件（--out <路径> 指定保存位置）
  attachment delete <uid>             删除附件

user 命令:
  user list [--limit n]               列出实例用户
  user get <用户名>                   查看指定用户
  user me                             查看当前账号
  user stats <用户名>                 用户统计（memo 数、标签数）

instance 命令:
  instance profile                    实例信息（版本、管理员、访问模式）
  instance stats                      实例存储统计

memo list 选项:
  --limit, -n <数量>      返回条数上限（默认 50，最大 1000）
  --tag <标签>            按标签过滤（不含 #）
  --search <关键字>       按内容关键字过滤（支持中文）
  --visibility <值>       按可见性过滤：PRIVATE | PROTECTED | PUBLIC
  --since <时长>          按创建时间过滤：7d / 24h / 30m，或 ISO 时间戳
  --pinned                只看置顶
  --archived              只看归档（默认只看正常）
  --orderby <表达式>      排序，如 "pinned desc, create_time desc"
  --filter <CEL>          原生 CEL 过滤表达式（与上面选项以 && 组合）
  --pagetoken <token>     翻页令牌（取自上次响应的 nextPageToken）

通用选项:
  --url <地址>            Memos 实例地址（默认取 MEMOS_URL，再默认 http://localhost:5230）
  --token <令牌>          个人访问令牌（默认取 MEMOS_TOKEN）
  --format <格式>         输出格式：json（默认）| yaml | table
  --timeout <毫秒>        请求超时（默认 30000）
  --insecure              跳过 TLS 证书校验（自签名证书场景）
  -h, --help              显示帮助
  -v, --version           显示版本

示例:
  node skill.js memo create "今天读了 #Rust 所有权章节" --url http://localhost:5230 --token xxx
  node skill.js memo list --tag Rust --limit 10
  node skill.js memo list --search 所有权 --since 7d --format yaml
  node skill.js memo update abc123 --content "修订后的内容" --visibility PUBLIC
  node skill.js memo comment abc123 "这条评论很有用"
  node skill.js memo react abc123 👍
  node skill.js attachment upload ./diagram.png --memo abc123

环境变量:
  MEMOS_URL        实例地址
  MEMOS_TOKEN      个人访问令牌（Memos 网页端「设置 → 访问令牌」创建）
  MEMOS_TIMEOUT    请求超时毫秒
  MEMOS_INSECURE   设为 true 跳过 TLS 校验
  也可在本 skill 目录的 .env 中配置以上变量。

输出:
  结果输出 JSON/YAML 到 stdout，错误输出 JSON 到 stderr，便于程序与 LLM 解析。
`);
}

/**
 * 显示版本
 */
function showVersion() {
  console.log(`Memos API 客户端 v${SKILL_VERSION}`);
}

/**
 * 子命令分发表：对象 -> 子命令 -> 处理函数
 */
const DISPATCH = {
  memo: {
    list: cmd.cmdMemoList,
    ls: cmd.cmdMemoList,
    get: cmd.cmdMemoGet,
    show: cmd.cmdMemoGet,
    create: cmd.cmdMemoCreate,
    new: cmd.cmdMemoCreate,
    add: cmd.cmdMemoCreate,
    update: cmd.cmdMemoUpdate,
    edit: cmd.cmdMemoUpdate,
    delete: cmd.cmdMemoDelete,
    rm: cmd.cmdMemoDelete,
    archive: cmd.cmdMemoArchive,
    restore: cmd.cmdMemoRestore,
    pin: cmd.cmdMemoPin,
    unpin: cmd.cmdMemoUnpin,
    comments: cmd.cmdMemoComments,
    comment: cmd.cmdMemoComment,
    reactions: cmd.cmdMemoReactions,
    react: cmd.cmdMemoReact,
    unreact: cmd.cmdMemoUnreact,
    tags: cmd.cmdMemoTags,
  },
  attachment: {
    list: cmd.cmdAttachmentList,
    ls: cmd.cmdAttachmentList,
    get: cmd.cmdAttachmentGet,
    upload: cmd.cmdAttachmentUpload,
    put: cmd.cmdAttachmentUpload,
    download: cmd.cmdAttachmentDownload,
    dl: cmd.cmdAttachmentDownload,
    delete: cmd.cmdAttachmentDelete,
    rm: cmd.cmdAttachmentDelete,
  },
  user: {
    list: cmd.cmdUserList,
    ls: cmd.cmdUserList,
    get: cmd.cmdUserGet,
    me: cmd.cmdUserMe,
    stats: cmd.cmdUserStats,
  },
  instance: {
    profile: cmd.cmdInstanceProfile,
    info: cmd.cmdInstanceProfile,
    stats: cmd.cmdInstanceStats,
  },
};

/**
 * 主函数
 */
async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));

  if (options.v || options.version) {
    showVersion();
    return;
  }

  if (positional.length === 0 || options.h || options.help) {
    showHelp();
    return;
  }

  const [objectName, subName, ...rest] = positional;
  const object = DISPATCH[objectName.toLowerCase()];

  if (!object) {
    handleError(
      new Error(`未知对象: ${objectName}`),
      `支持的对象：${Object.keys(DISPATCH).join(" / ")}`,
      2
    );
    return;
  }

  if (!subName) {
    handleError(
      new Error("缺少子命令"),
      `${objectName} 的子命令：${[...new Set(Object.keys(object))].join(" / ")}`,
      2
    );
    return;
  }

  const handler = object[subName.toLowerCase()];
  if (!handler) {
    handleError(
      new Error(`未知子命令: ${objectName} ${subName}`),
      `${objectName} 的子命令：${[...new Set(Object.keys(object))].join(" / ")}`,
      2
    );
    return;
  }

  try {
    const result = await handler(rest, options);
    output(result, String(options.format || "json").toLowerCase());
  } catch (e) {
    handleError(e, `${objectName} ${subName} 执行失败`);
  }
}

main();
