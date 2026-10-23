/**
 * 记忆相关命令：retain / recall /
 *               list-memories / get-memory / update-memory / invalidate-memory
 */

const fs = require("fs");
const { usageError } = require("../errors");
const {
  toInt,
  toBool,
  parseJsonOption,
  parseJsonObjectOption,
  splitCsv,
  oneOf,
} = require("../parser");

const MEMORY_TYPES = ["world", "experience", "observation"];
const TAGS_MATCH_MODES = ["any", "all", "any_strict", "all_strict", "exact"];

/**
 * 取必填文本（多个位置参数用空格拼接）
 * @param {string[]} positionals
 * @param {string} command
 * @param {string} label
 * @returns {string}
 */
function requireText(positionals, command, label) {
  const text = (positionals || []).join(" ").trim();
  if (!text) {
    // 纯英文参数名（如 memory_id）前补「参数」，中文标签直接拼接
    const prefix = /^[A-Za-z_]/.test(label) ? "参数 " : "";
    throw usageError(`${command} 需要${prefix}${label}`, `用法：node skill.js ${command} <${label}> [选项]`);
  }
  return text;
}

/**
 * 读取 retain 内容：位置参数或 --content-file（- 表示 stdin）
 * @param {string[]} positionals
 * @param {Object} options
 * @returns {string}
 */
function readContent(positionals, options) {
  const fromArgs = (positionals || []).join(" ").trim();

  if (options.contentFile !== undefined) {
    if (fromArgs) {
      throw usageError("内容同时来自位置参数与 --content-file，请二选一");
    }
    const file = String(options.contentFile);
    let text;
    try {
      text = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
    } catch (e) {
      throw usageError(`无法读取 --content-file：${e.message}`);
    }
    if (!String(text).trim()) throw usageError("--content-file 内容为空");
    return String(text).trim();
  }

  if (!fromArgs) {
    throw usageError(
      "retain 需要记忆内容",
      "用法：node skill.js retain <内容> [选项]；内容较长时可用 --content-file <路径>（- 表示标准输入）"
    );
  }
  return fromArgs;
}

/**
 * 校验 tags-match 取值
 * @param {*} value
 * @returns {string}
 */
function tagsMatch(value) {
  return oneOf(value, "--tags-match", TAGS_MATCH_MODES);
}

/**
 * retain 实现
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function retainWith(positionals, options, ctx) {
  const args = {
    content: readContent(positionals, options),
    context: options.context === undefined ? "general" : String(options.context),
  };

  if (options.timestamp !== undefined) args.timestamp = String(options.timestamp);
  if (options.tags !== undefined) args.tags = splitCsv(options.tags, "--tags");
  if (options.metadata !== undefined) {
    args.metadata = parseJsonObjectOption(options.metadata, "--metadata");
  }
  if (options.documentId !== undefined) args.document_id = String(options.documentId);
  if (options.strategy !== undefined) args.strategy = String(options.strategy);
  if (options.updateMode !== undefined) {
    args.update_mode = String(options.updateMode);
  }

  return ctx.client.callTool("retain", args);
}

/**
 * retain —— 写入一条记忆
 */
async function cmdRetain(positionals, options, ctx) {
  return retainWith(positionals, options, ctx);
}

/**
 * recall —— 检索相关记忆
 */
async function cmdRecall(positionals, options, ctx) {
  const query = requireText(positionals, "recall", "查询词");

  const args = {
    query,
    max_tokens:
      options.maxTokens === undefined
        ? 4096
        : toInt(options.maxTokens, "--max-tokens", { min: 1 }),
    budget: options.budget === undefined ? "high" : String(options.budget),
  };

  if (options.types !== undefined) args.types = splitCsv(options.types, "--types");
  if (options.preferObservations) args.prefer_observations = true;
  if (options.tags !== undefined) args.tags = splitCsv(options.tags, "--tags");
  if (options.tagsMatch !== undefined) args.tags_match = tagsMatch(options.tagsMatch);
  if (options.tagGroups !== undefined) {
    const groups = parseJsonOption(options.tagGroups, "--tag-groups");
    if (!Array.isArray(groups)) throw usageError("--tag-groups 需要 JSON 数组");
    args.tag_groups = groups;
  }
  if (options.queryTimestamp !== undefined) {
    args.query_timestamp = String(options.queryTimestamp);
  }
  if (options.minScores !== undefined) {
    args.min_scores = parseJsonObjectOption(options.minScores, "--min-scores");
  }
  if (options.temporalWindow !== undefined) {
    args.temporal_window = parseJsonObjectOption(options.temporalWindow, "--temporal-window");
  }

  return ctx.client.callTool("recall", args);
}

/**
 * list-memories —— 分页列出记忆
 */
async function cmdListMemories(positionals, options, ctx) {
  const args = {
    // 服务端工具的查询字段名是 q（不是 query）
    limit: options.limit === undefined ? 100 : toInt(options.limit, "--limit", { min: 0 }),
    offset: options.offset === undefined ? 0 : toInt(options.offset, "--offset", { min: 0 }),
  };

  if (options.type !== undefined) args.type = oneOf(options.type, "--type", MEMORY_TYPES);
  if (options.query !== undefined) args.q = String(options.query);
  if (options.tags !== undefined) args.tags = splitCsv(options.tags, "--tags");
  if (options.tagsMatch !== undefined) args.tags_match = tagsMatch(options.tagsMatch);

  return ctx.client.callTool("list_memories", args);
}

/**
 * get-memory —— 查看单条记忆
 */
async function cmdGetMemory(positionals, options, ctx) {
  const memoryId = requireText(positionals, "get-memory", "memory_id");
  return ctx.client.callTool("get_memory", { memory_id: memoryId });
}

/**
 * update-memory —— 修改单条记忆
 */
async function cmdUpdateMemory(positionals, options, ctx) {
  const memoryId = requireText(positionals, "update-memory", "memory_id");
  const args = { memory_id: memoryId };
  let changed = false;

  if (options.text !== undefined) {
    args.text = String(options.text);
    changed = true;
  }
  if (options.context !== undefined) {
    args.context = String(options.context);
    changed = true;
  }
  if (options.occurredStart !== undefined) {
    args.occurred_start = String(options.occurredStart);
    changed = true;
  }
  if (options.occurredEnd !== undefined) {
    args.occurred_end = String(options.occurredEnd);
    changed = true;
  }
  if (options.factType !== undefined) {
    args.fact_type = String(options.factType);
    changed = true;
  }
  if (options.entities !== undefined) {
    args.entities = splitCsv(options.entities, "--entities");
    changed = true;
  }
  if (options.resolveEntities !== undefined) {
    args.resolve_entities = toBool(options.resolveEntities, "--resolve-entities");
    changed = true;
  }

  if (!changed) {
    throw usageError(
      "update-memory 至少需要提供一个要修改的字段",
      "可用：--text / --context / --occurred-start / --occurred-end / --fact-type / --entities / --resolve-entities / --no-resolve-entities"
    );
  }

  return ctx.client.callTool("update_memory", args);
}

/**
 * invalidate-memory —— 软作废单条记忆（--restore 可恢复）
 */
async function cmdInvalidateMemory(positionals, options, ctx) {
  const memoryId = requireText(positionals, "invalidate-memory", "memory_id");
  const args = { memory_id: memoryId };

  if (options.reason !== undefined) args.reason = String(options.reason);
  if (options.restore) args.restore = true;

  return ctx.client.callTool("invalidate_memory", args);
}

module.exports = {
  cmdRetain,
  cmdRecall,
  cmdListMemories,
  cmdGetMemory,
  cmdUpdateMemory,
  cmdInvalidateMemory,
};
