/**
 * 查询命令
 */

const { graphqlQuery } = require("../api");
const { formatOutput } = require("../output");
const { handleError } = require("../errors");

/**
 * 查询命令
 */
async function cmdQuery(url, token, resource, options, pageId = null) {
  let query = "";
  let dataPath = "";

  switch (resource) {
    case "pages":
      query = `{
        pages {
          list ${options.orderBy ? `(orderBy: ${options.orderBy})` : ""} {
            id
            path
            title
            description
            contentType
            locale
            createdAt
            updatedAt
          }
        }
      }`;
      dataPath = "pages.list";
      break;

    case "page":
      if (!pageId) {
        console.error("错误: 请指定页面 ID");
        process.exit(1);
      }
      query = `{
        pages {
          single (id: ${pageId}) {
            id
            path
            title
            content
            description
            contentType
            locale
            createdAt
            updatedAt
          }
        }
      }`;
      dataPath = "pages.single";
      break;

    case "users":
      if (options.search) {
        query = `{
          users {
            search (query: "${options.search}") {
              id
              name
              email
              providerKey
              isActive
              createdAt
            }
          }
        }`;
        dataPath = "users.search";
      } else {
        query = `{
          users {
            list {
              id
              name
              email
              providerKey
              isActive
              createdAt
            }
          }
        }`;
        dataPath = "users.list";
      }
      break;

    case "groups":
      query = `{
        groups {
          list {
            id
            name
            isSystem
          }
        }
      }`;
      dataPath = "groups.list";
      break;

    default:
      console.error(`错误: 不支持的资源类型: ${resource}`);
      console.error("支持的资源: pages, page, users, groups");
      process.exit(1);
  }

  try {
    const result = await graphqlQuery(url, token, query);
    const data = dataPath.split(".").reduce((obj, key) => obj?.[key], result);

    if (options.limit && Array.isArray(data)) {
      console.log(`显示前 ${options.limit} 条记录 (共 ${data.length} 条)`);
      formatOutput(data.slice(0, parseInt(options.limit)), options.format);
    } else {
      const count = Array.isArray(data) ? data.length : 1;
      console.log(`查询结果: ${count} 条记录`);
      formatOutput(data, options.format);
    }
  } catch (error) {
    handleError(error, `查询 ${resource} 失败`);
  }
}

module.exports = { cmdQuery };