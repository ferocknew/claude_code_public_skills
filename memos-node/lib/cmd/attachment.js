/**
 * attachment 相关命令
 *
 * 覆盖 AttachmentService：
 *   list / get / upload / delete / download
 *
 * 上传走 POST /api/v1/attachments，content 字段为 base64（单次上传，适合 ≤ 数 MB 的文件）。
 */

const fs = require("fs");
const path = require("path");

const { apiRequest, normalizeMemoUid, getConfig } = require("../api");

/**
 * 精简 attachment 对象
 * @param {Object} att
 * @returns {Object}
 */
function simplifyAttachment(att) {
  return {
    uid: String(att.name || "").split("/").pop(),
    filename: att.filename,
    type: att.type,
    size: att.size,
    createTime: att.createTime,
    memo: att.memo || "",
    externalLink: att.externalLink || "",
  };
}

/**
 * 依据扩展名猜 MIME 类型（Memos 要求 type 必填）
 * @param {string} filePath
 * @returns {string}
 */
function guessMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const table = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".csv": "text/csv",
    ".zip": "application/zip",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
  };
  return table[ext] || "application/octet-stream";
}

/**
 * attachment list —— 列出附件
 */
async function cmdAttachmentList(args, options) {
  const config = getConfig(options);
  const res = await apiRequest("GET", "/api/v1/attachments", {
    config,
    query: { pageSize: options.limit, pageToken: options.pagetoken, filter: options.filter },
  });

  const attachments = (res.attachments || []).map(simplifyAttachment);
  return { count: attachments.length, nextPageToken: res.nextPageToken || "", attachments };
}

/**
 * attachment get —— 查看附件元信息
 */
async function cmdAttachmentGet(args, options) {
  const uid = String(args[0] || "").replace(/^attachments\//, "");
  if (!uid) throw new Error("缺少附件 uid，用法：attachment get <uid>");

  const config = getConfig(options);
  const att = await apiRequest("GET", `/api/v1/attachments/${encodeURIComponent(uid)}`, { config });
  return simplifyAttachment(att);
}

/**
 * attachment upload —— 上传本地文件
 */
async function cmdAttachmentUpload(args, options) {
  const filePath = args[0];
  if (!filePath) throw new Error("缺少本地文件路径，用法：attachment upload <本地文件> [--memo <uid>]");
  if (!fs.existsSync(filePath)) throw new Error(`本地文件不存在：${filePath}`);

  const buffer = fs.readFileSync(filePath);
  const filename = options.filename || path.basename(filePath);
  const type = options.type || guessMime(filePath);

  const config = getConfig(options);
  const att = await apiRequest("POST", "/api/v1/attachments", {
    config,
    body: {
      filename,
      type,
      content: buffer.toString("base64"),
      ...(options.memo ? { memo: `memos/${normalizeMemoUid(options.memo)}` } : {}),
    },
  });

  const result = simplifyAttachment(att);
  result.url = `${config.baseUrl}/file/attachments/${result.uid}/${encodeURIComponent(filename)}`;
  result.bytes = buffer.length;
  return result;
}

/**
 * attachment download —— 下载附件到本地
 */
async function cmdAttachmentDownload(args, options) {
  const uid = String(args[0] || "").replace(/^attachments\//, "");
  if (!uid) throw new Error("缺少附件 uid，用法：attachment download <uid> [--out <本地路径>]");

  const config = getConfig(options);
  const meta = await apiRequest("GET", `/api/v1/attachments/${encodeURIComponent(uid)}`, { config });

  const outPath = options.out || meta.filename || `${uid}.bin`;
  const buffer = await apiRequest(
    "GET",
    `/file/attachments/${encodeURIComponent(uid)}/${encodeURIComponent(meta.filename)}`,
    { config, accept: "buffer" }
  );

  fs.writeFileSync(outPath, buffer);
  return {
    downloaded: true,
    uid,
    filename: meta.filename,
    type: meta.type,
    bytes: buffer.length,
    path: path.resolve(outPath),
  };
}

/**
 * attachment delete —— 删除附件
 */
async function cmdAttachmentDelete(args, options) {
  const uid = String(args[0] || "").replace(/^attachments\//, "");
  if (!uid) throw new Error("缺少附件 uid，用法：attachment delete <uid>");

  const config = getConfig(options);
  await apiRequest("DELETE", `/api/v1/attachments/${encodeURIComponent(uid)}`, { config });
  return { deleted: true, uid };
}

module.exports = {
  cmdAttachmentList,
  cmdAttachmentGet,
  cmdAttachmentUpload,
  cmdAttachmentDownload,
  cmdAttachmentDelete,
};
