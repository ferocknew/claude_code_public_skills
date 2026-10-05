/**
 * keygen 子命令：生成本地 SSH 密钥对（纯本地操作，不需连接）
 *
 * 用法:
 *   node skill.js keygen --type ed25519 [--out ~/.ssh/id_ed25519] [--comment "me@host"] [--passphrase xxx]
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { utils } = require("ssh2");
const { handleError } = require("../errors");

/**
 * @param {string[]} args
 * @param {Object} options
 */
async function cmdKeygen(args, options) {
  const type = (options.type || "ed25519").toLowerCase();
  const supported = ["ed25519", "ecdsa", "rsa"];

  if (!supported.includes(type)) {
    handleError(
      new Error(`不支持的密钥类型: ${type}`),
      `支持的类型: ${supported.join(", ")}`,
      2
    );
    return;
  }

  const defaultOut = path.join(os.homedir(), ".ssh", `id_${type}`);
  const outPath = expandHome(options.out || defaultOut);

  // 防止覆盖已有私钥
  if (fs.existsSync(outPath) && !options.force) {
    handleError(
      new Error(`私钥文件已存在: ${outPath}`),
      "为避免覆盖，请指定其他 --out 或加 --force",
      2
    );
    return;
  }

  const keyOpts = { comment: options.comment || `ssh2-node@${os.hostname()}` };
  if (type === "rsa") keyOpts.bits = parseInt(options.bits || "4096", 10);
  if (options.passphrase) {
    keyOpts.passphrase = options.passphrase;
    keyOpts.cipher = options.cipher || "aes256-cbc";
  }

  try {
    const keys = await new Promise((resolve, reject) => {
      utils.generateKeyPair(type, keyOpts, (err, k) => (err ? reject(err) : resolve(k)));
    });

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, keys.private, { mode: 0o600 });
    fs.writeFileSync(`${outPath}.pub`, keys.public, { mode: 0o644 });

    console.log(
      JSON.stringify(
        {
          type,
          privateKey: outPath,
          publicKey: `${outPath}.pub`,
          comment: keyOpts.comment,
          encrypted: !!options.passphrase,
        },
        null,
        2
      )
    );
  } catch (e) {
    handleError(e, "生成密钥对失败");
  }
}

/**
 * 展开开头的 ~ 为用户目录
 * @param {string} p
 * @returns {string}
 */
function expandHome(p) {
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

module.exports = { cmdKeygen };
