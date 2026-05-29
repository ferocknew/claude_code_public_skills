/**
 * Memory MCP → 思源笔记同步模块
 *
 * 将 Memory MCP 的实体数据同步到思源笔记 LLM 记忆库
 *
 * 文档结构：
 *   实体名/                    ← 实体（父文档）
 *     ├── 元数据表格 + 基本信息 + 关联关系 + 观察列表
 *     ├── 观察标题1             ← 观察（子文档）
 *     ├── 观察标题2
 *     └── ...
 *
 * 格式约定：
 *   - YAML frontmatter 被思源吞掉，改用顶部表格存元数据
 *   - 双链输入格式: ((block-id 'name'))
 *   - 观察标题从内容自动生成
 *   - 记录 Memory MCP UUID，方便后续定位、更新、删除
 */

const { siyuanPost } = require("./api");

// ──────────────────────────── helpers ────────────────────────────

/**
 * 从观察内容生成短标题
 * 1. 去掉日期前缀 "2026-05-29: "
 * 2. 取第一个自然断句（标点前），最多 20 字符
 * 3. 无标点则取前 15 字符
 */
function generateObsTitle(content) {
  let text = content.replace(/^\d{4}-\d{2}-\d{2}:\s*/, "").trim();
  const match = text.match(/^(.{2,20}?)[，。、；：,\.;:\s]/);
  if (match) return match[1].trim();
  return text.length <= 20 ? text : text.substring(0, 15);
}

/**
 * 通过 hpath 查找文档 ID
 */
async function findDoc(url, token, notebookId, hpath) {
  try {
    const data = await siyuanPost(url, token, "/api/query/sql", {
      stmt: `SELECT id FROM blocks WHERE box='${notebookId}' AND type='d' AND hpath='${hpath}' LIMIT 1`
    });
    return Array.isArray(data) && data.length > 0 ? data[0].id : null;
  } catch {
    return null;
  }
}

/**
 * 通过 Memory MCP UUID 查找思源文档 ID
 * 在 content 字段中搜索 | memory-uuid | <uuid> | 行
 */
async function findDocByUuid(url, token, notebookId, memoryUuid) {
  if (!memoryUuid) return null;
  try {
    const data = await siyuanPost(url, token, "/api/query/sql", {
      stmt: `SELECT id FROM blocks WHERE box='${notebookId}' AND type='d' AND content LIKE '%${memoryUuid}%' LIMIT 1`
    });
    return Array.isArray(data) && data.length > 0 ? data[0].id : null;
  } catch {
    return null;
  }
}

// ──────────────────────────── builders ────────────────────────────

/**
 * 构建实体文档 Markdown
 */
function buildEntityMd({ name, entityType, uuid, date, tags, obsList, relations }) {
  const tagStr = (tags || [entityType]).join(", ");

  let md = "";

  // 元数据表格
  md += "| 属性 | 值 |\n|------|-----|\n";
  md += "| category | MAIN_ENTITY |\n";
  md += `| type | 实体 |\n`;
  md += `| entity_class | ${entityType} |\n`;
  md += `| entity_label | ${name} |\n`;
  if (uuid) md += `| memory-uuid | ${uuid} |\n`;
  md += `| created | ${date} |\n`;
  md += `| tags | ${tagStr} |\n\n`;

  // 实体类型
  md += `**实体类型**: ${entityType}\n\n`;

  // 基本信息
  md += "## 基本信息\n";
  md += `- **创建时间**: ${date}\n`;
  md += `- **观察数量**: ${obsList.length}\n\n`;

  // 关联关系
  md += "## 关联关系\n";
  if (relations && relations.length > 0) {
    relations.forEach(r => {
      md += `- ${r.relationType}: ${r.toEntity}\n`;
    });
  } else {
    md += "<!-- 暂无关联关系 -->\n";
  }
  md += "\n";

  // 观察列表（双链）
  md += "### 观察\n";
  obsList.forEach(obs => {
    md += `- ((${obs.id} '${obs.title}'))\n`;
  });

  return md;
}

/**
 * 构建观察文档 Markdown
 */
function buildObsMd(content, parentName, parentId, date, obsUuid) {
  let md = "";

  // 元数据表格
  md += "| 属性 | 值 |\n|------|-----|\n";
  md += "| category | OBSERVATION |\n";
  md += "| type | 观察 |\n";
  md += `| parent | ${parentName} |\n`;
  if (obsUuid) md += `| memory-uuid | ${obsUuid} |\n`;
  md += `| created | ${date} |\n\n`;

  // 内容
  md += `${date}: ${content}\n\n`;

  // 关联关系（双链指回父实体）
  md += "## 关联关系\n";
  md += `- 属于: ((${parentId} '${parentName}'))\n`;

  return md;
}

// ──────────────────────────── main ────────────────────────────

/**
 * 同步 Memory MCP 实体到思源笔记
 *
 * @param {string} url        - 思源服务地址
 * @param {string} token      - API Token
 * @param {string} notebookId - 目标笔记本 ID
 * @param {Object} entityData - Memory MCP 实体数据
 * @param {string} entityData.name         - 实体名称
 * @param {string} entityData.entityType    - 实体类型
 * @param {string} [entityData.uuid]        - Memory MCP 实体 UUID
 * @param {Array}  entityData.observations  - 观察（字符串 或 {uuid, content}）
 * @param {Array}  [entityData.tags]        - 标签
 * @param {Array}  [entityData.relations]   - 关联 [{relationType, toEntity}]
 * @param {string} [entityData.createdAt]   - 创建日期
 * @returns {Promise<{entityId, observations}>}
 */
async function syncEntity(url, token, notebookId, entityData) {
  const {
    name,
    entityType,
    uuid,
    observations = [],
    tags,
    relations,
    createdAt,
  } = entityData;
  const date = createdAt || new Date().toISOString().split("T")[0];
  const basePath = `/${name}`;

  // 1. 查找或创建实体文档（优先按 UUID 查找，其次按 hpath）
  let entityId = uuid
    ? await findDocByUuid(url, token, notebookId, uuid)
    : null;
  entityId = entityId || await findDoc(url, token, notebookId, basePath);

  if (!entityId) {
    const result = await siyuanPost(url, token, "/api/filetree/createDocWithMd", {
      notebook: notebookId,
      path: basePath,
      markdown: "",
    });
    entityId = typeof result === "string" ? result : result.id || result;
  }

  // 2. 逐条创建/更新观察文档
  const obsList = [];
  for (const obs of observations) {
    const content = typeof obs === "string" ? obs : obs.content;
    const obsUuid = typeof obs === "object" ? obs.uuid : null;
    const title = generateObsTitle(content);
    const obsPath = `${basePath}/${title}`;
    const obsMd = buildObsMd(content, name, entityId, date, obsUuid);

    // 优先按 UUID 查找已有观察
    let obsId = obsUuid
      ? await findDocByUuid(url, token, notebookId, obsUuid)
      : null;
    obsId = obsId || await findDoc(url, token, notebookId, obsPath);

    if (obsId) {
      await siyuanPost(url, token, "/api/block/updateBlock", {
        dataType: "markdown",
        data: obsMd,
        id: obsId,
      });
    } else {
      const result = await siyuanPost(url, token, "/api/filetree/createDocWithMd", {
        notebook: notebookId,
        path: obsPath,
        markdown: obsMd,
      });
      obsId = typeof result === "string" ? result : result.id || result;
    }

    obsList.push({ id: obsId, title, uuid: obsUuid });
  }

  // 3. 更新实体文档（写入观察双链）
  const entityMd = buildEntityMd({ name, entityType, uuid, date, tags, obsList, relations });
  await siyuanPost(url, token, "/api/block/updateBlock", {
    dataType: "markdown",
    data: entityMd,
    id: entityId,
  });

  return { entityId, observations: obsList };
}

/**
 * 通过 Memory MCP UUID 删除思源笔记中的实体及所有观察
 *
 * @param {string} url        - 思源服务地址
 * @param {string} token      - API Token
 * @param {string} notebookId - 笔记本 ID
 * @param {string} memoryUuid - Memory MCP 实体 UUID
 */
async function deleteByUuid(url, token, notebookId, memoryUuid) {
  const entityId = await findDocByUuid(url, token, notebookId, memoryUuid);
  if (!entityId) {
    console.log(`未找到 UUID=${memoryUuid} 对应的文档`);
    return null;
  }
  await siyuanPost(url, token, "/api/filetree/removeDocByID", { id: entityId });
  return entityId;
}

module.exports = { syncEntity, deleteByUuid, generateObsTitle };
