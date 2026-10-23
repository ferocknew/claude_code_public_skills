/**
 * 元命令：tools / call
 *
 *   tools  列出服务端暴露的工具（名称、首行描述、必填参数）
 *   call   通用兜底：直接调用任意工具，参数用 --args / --args-file 传入 JSON
 */

const fs = require("fs");
const { usageError } = require("../errors");
const { parseJsonObjectOption } = require("../parser");

/**
 * 取描述首行
 * @param {*} description
 * @returns {string}
 */
function firstLine(description) {
  if (typeof description !== "string") return "";
  const line = description.split(/\r?\n/).map((part) => part.trim()).find(Boolean);
  return line || "";
}

/**
 * tools —— 列出工具
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdTools(positionals, options, ctx) {
  const tools = await ctx.client.listTools();
  return {
    count: tools.length,
    tools: tools.map((tool) => ({
      name: tool && tool.name ? tool.name : "",
      description: firstLine(tool && tool.description),
      required:
        tool && tool.inputSchema && Array.isArray(tool.inputSchema.required)
          ? tool.inputSchema.required
          : [],
    })),
  };
}

/**
 * 读取 --args / --args-file
 * @param {Object} options
 * @returns {Object}
 */
function readToolArgs(options) {
  const hasInline = options.args !== undefined;
  const hasFile = options.argsFile !== undefined;

  if (hasInline && hasFile) {
    throw usageError("--args 与 --args-file 只能二选一");
  }
  if (!hasInline && !hasFile) return {};

  if (hasInline) {
    return parseJsonObjectOption(options.args, "--args");
  }

  const file = String(options.argsFile);
  let text;
  try {
    text = file === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(file, "utf8");
  } catch (e) {
    throw usageError(`无法读取 --args-file：${e.message}`);
  }
  if (!String(text).trim()) throw usageError("--args-file 内容为空");
  return parseJsonObjectOption(String(text), "--args-file");
}

/**
 * call —— 通用工具调用
 * @param {string[]} positionals
 * @param {Object} options
 * @param {Object} ctx
 */
async function cmdCall(positionals, options, ctx) {
  const tool = (positionals[0] || "").trim();
  if (!tool) {
    throw usageError(
      "call 需要工具名",
      "用法：node skill.js call <tool> --args '{...}'（可先执行 node skill.js tools 查看工具清单）"
    );
  }
  if (positionals.length > 1) {
    throw usageError(
      "call 只接受一个工具名，工具参数请用 --args 或 --args-file 传入"
    );
  }

  return ctx.client.callTool(tool, readToolArgs(options));
}

module.exports = { cmdTools, cmdCall };
