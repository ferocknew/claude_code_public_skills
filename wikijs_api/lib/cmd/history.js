/**
 * 页面历史命令
 */

const { graphqlQuery } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");
const yaml = require("js-yaml");

/**
 * 页面历史命令
 */
async function cmdHistory(url, token, pageId, options) {
  const offsetPage = parseInt(options.page) || 0;
  const offsetSize = parseInt(options.limit) || 10;

  const query = `{
    pages {
      history (
        id: ${pageId}
        offsetPage: ${offsetPage}
        offsetSize: ${offsetSize}
      ) {
        total
        trail {
          versionId
          versionDate
          authorId
          authorName
          actionType
          valueBefore
          valueAfter
        }
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const history = result.pages.history;

    // YAML 或 JSON 格式直接输出
    if (options.format === "yaml") {
      console.log(yaml.dump({
        total: history.total,
        page: pageId,
        trail: history.trail
      }, { lineWidth: -1, noRefs: true }));
      return;
    }

    if (options.format === "json") {
      console.log(JSON.stringify(history, null, 2));
      return;
    }

    // 默认格式
    console.log(`\n页面历史 (共 ${history.total} 条记录):\n`);

    const actionMap = {
      "INIT": "创建",
      "UPDATE": "更新",
      "DELETE": "删除",
      "MOVE": "移动",
      "RENAME": "重命名"
    };

    history.trail.forEach((item, idx) => {
      const action = actionMap[item.actionType] || item.actionType;
      const versionNum = history.total - (offsetPage * offsetSize + idx);

      console.log(`${versionNum}. ${action} - ${item.authorName || '未知'}`);
      console.log(`   时间: ${item.versionDate}`);
      if (item.valueBefore && item.valueAfter) {
        console.log(`   变更: ${item.valueBefore} → ${item.valueAfter}`);
      } else if (item.valueAfter) {
        console.log(`   内容: ${item.valueAfter.substring(0, 50)}${item.valueAfter.length > 50 ? '...' : ''}`);
      }
      console.log(`   版本ID: ${item.versionId}`);
      console.log();
    });

    if ((offsetPage + 1) * offsetSize < history.total) {
      console.log(`更多记录: node skill.js history <url> <token> ${pageId} --page ${offsetPage + 1}`);
    }
  } catch (error) {
    handleError(error, "获取页面历史失败");
  }
}

module.exports = { cmdHistory };