/**
 * 知识库命令：
 *   get-knowledge-base-tree (kb-tree)
 *   search-knowledge-base (kb-search)
 *   get-knowledge-page (kb-page)
 *   create-knowledge-folder (kb-create-folder)
 *   create-knowledge-page (kb-create-page)
 *   update-knowledge-node (kb-update)
 */

const { toInt, splitCsv } = require("../parser");
const { usageError } = require("../errors");

/**
 * get-knowledge-base-tree —— 浏览知识库树形目录
 */
async function cmdGetKnowledgeBaseTree(positionals, options, ctx) {
  return ctx.client.callTool("get_knowledge_base_tree", {});
}

/**
 * search-knowledge-base —— 搜索知识库页面
 */
async function cmdSearchKnowledgeBase(positionals, options, ctx) {
  const query = (positionals || []).join(" ").trim();
  if (!query) {
    throw usageError("search-knowledge-base 需要参数 query", "用法：node skill.js search-knowledge-base <查询词> [--limit <n>]");
  }

  const args = { query };
  if (options.limit !== undefined) args.limit = toInt(options.limit, "--limit", { min: 1 });

  return ctx.client.callTool("search_knowledge_base", args);
}

/**
 * get-knowledge-page —— 获取知识库单页内容
 */
async function cmdGetKnowledgePage(positionals, options, ctx) {
  const pageId = (positionals || []).join(" ").trim();
  if (!pageId) {
    throw usageError("get-knowledge-page 需要参数 page_id", "用法：node skill.js get-knowledge-page <page_id>");
  }

  return ctx.client.callTool("get_knowledge_page", { page_id: pageId });
}

/**
 * create-knowledge-folder —— 创建知识库目录
 */
async function cmdCreateKnowledgeFolder(positionals, options, ctx) {
  const name = options.name !== undefined ? String(options.name).trim() : (positionals || []).join(" ").trim();
  if (!name) {
    throw usageError("create-knowledge-folder 需要目录名称", "用法：node skill.js create-knowledge-folder <目录名> [--parent-id <id>]");
  }

  const args = { name };
  if (options.parentId !== undefined) args.parent_id = String(options.parentId);

  return ctx.client.callTool("create_knowledge_folder", args);
}

/**
 * create-knowledge-page —— 创建知识库页面
 */
async function cmdCreateKnowledgePage(positionals, options, ctx) {
  let name = options.name !== undefined ? String(options.name).trim() : "";
  let sourceQuery = options.sourceQuery !== undefined ? String(options.sourceQuery).trim() : "";

  if (!name && positionals && positionals.length > 0) {
    name = positionals[0];
    if (!sourceQuery && positionals.length > 1) {
      sourceQuery = positionals.slice(1).join(" ").trim();
    }
  }

  if (!name || !sourceQuery) {
    throw usageError(
      "create-knowledge-page 需要页面名称与 source_query",
      "用法：node skill.js create-knowledge-page <名称> <生成查询词> [--parent-id <id>] [--tags <a,b>]"
    );
  }

  const args = {
    name,
    source_query: sourceQuery,
  };

  if (options.parentId !== undefined) args.parent_id = String(options.parentId);
  if (options.tags !== undefined) args.tags = splitCsv(options.tags, "--tags");
  if (options.maxTokens !== undefined) args.max_tokens = toInt(options.maxTokens, "--max-tokens", { min: 1 });

  return ctx.client.callTool("create_knowledge_page", args);
}

/**
 * update-knowledge-node —— 更新知识库节点（重命名/移动/调整选项）
 */
async function cmdUpdateKnowledgeNode(positionals, options, ctx) {
  const nodeId = (positionals || []).join(" ").trim();
  if (!nodeId) {
    throw usageError("update-knowledge-node 需要参数 node_id", "用法：node skill.js update-knowledge-node <node_id> [选项]");
  }

  const args = { node_id: nodeId };
  let changed = false;

  if (options.name !== undefined) {
    args.name = String(options.name);
    changed = true;
  }
  if (options.parentId !== undefined) {
    args.parent_id = String(options.parentId);
    changed = true;
  }
  if (options.sourceQuery !== undefined) {
    args.source_query = String(options.sourceQuery);
    changed = true;
  }
  if (options.tags !== undefined) {
    args.tags = splitCsv(options.tags, "--tags");
    changed = true;
  }
  if (options.maxTokens !== undefined) {
    args.max_tokens = toInt(options.maxTokens, "--max-tokens", { min: 1 });
    changed = true;
  }

  if (!changed) {
    throw usageError(
      "update-knowledge-node 至少需要提供一个修改项",
      "可用：--name / --parent-id / --source-query / --tags / --max-tokens"
    );
  }

  return ctx.client.callTool("update_knowledge_node", args);
}

module.exports = {
  cmdGetKnowledgeBaseTree,
  cmdSearchKnowledgeBase,
  cmdGetKnowledgePage,
  cmdCreateKnowledgeFolder,
  cmdCreateKnowledgePage,
  cmdUpdateKnowledgeNode,
};
