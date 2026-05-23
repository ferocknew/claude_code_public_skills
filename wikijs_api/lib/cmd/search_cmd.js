/**
 * 搜索页面命令
 */

const { graphqlQuery } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");
const { extractSnippet } = require("./search");

/**
 * 搜索页面命令
 */
async function cmdSearch(url, token, queryStr, options) {
  const query = `{
    pages {
      search(query: "${queryStr.replace(/"/g, '\\"')}"${options.path ? `, path: "${options.path}"` : ""}${options.locale ? `, locale: "${options.locale}"` : ""}) {
        results {
          id
          title
          path
          description
          locale
        }
        totalHits
        suggestions
      }
    }
  }`;

  try {
    const result = await graphqlQuery(url, token, query);
    const searchResult = result.pages.search;

    console.log(`\n搜索 "${queryStr}" 找到 ${searchResult.totalHits} 条结果:\n`);

    let results = searchResult.results;
    if (options.limit) {
      results = results.slice(0, parseInt(options.limit));
    }

    // 默认启用预览摘要（行模式）
    const enablePreview = options.preview || options.snippet || (!options.format || options.format === "default");
    const contextLength = parseInt(options.contextLength) || 1; // 默认行模式
    const previewCount = parseInt(options.previewCount) || 3;

    if (enablePreview) {

      for (let i = 0; i < Math.min(results.length, previewCount); i++) {
        const page = results[i];
        const pageQuery = `{
          pages {
            single (id: ${page.id}) {
              content
            }
          }
        }`;
        const pageResult = await graphqlQuery(url, token, pageQuery);
        const content = pageResult.pages.single?.content || "";

        page.snippet = extractSnippet(content, queryStr, contextLength);
      }
    }

    // 格式化输出
    if (options.format === "json") {
      formatOutput(results, "json");
    } else {
      results.forEach((r, idx) => {
        console.log(`${idx + 1}. [${r.title}](${r.path})`);
        if (r.snippet) {
          console.log(`   ${r.snippet}`);
        }
        console.log();
      });
    }

    if (searchResult.suggestions && searchResult.suggestions.length > 0) {
      console.log(`\n建议搜索词: ${searchResult.suggestions.join(", ")}`);
    }
  } catch (error) {
    handleError(error, "搜索页面失败");
  }
}

module.exports = { cmdSearch, extractSnippet };