#!/usr/bin/env node

/**
 * Magpie Image Generation CLI & Node.js Module (Zero-dependency)
 * Calls Magpie Gateway's OpenAI-compatible image generation API (/v1/images/generations).
 * Configuration is loaded from .env without hardcoding sensitive keys in code.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// 简单轻量的 .env 解析器（零第三方依赖）
function loadEnv(envPath) {
  const candidates = [];
  if (envPath) candidates.push(path.resolve(envPath));
  candidates.push(path.resolve(__dirname, '../.env'));
  candidates.push(path.resolve(process.cwd(), '.env'));

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const content = fs.readFileSync(c, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (k && !process.env[k]) {
              process.env[k] = v;
            }
          }
        }
        break;
      } catch (e) {
        // ignore
      }
    }
  }
}

// 按图片二进制魔数推断扩展名，避免把 jpeg/webp 误存为 .png
function detectImageExt(buf) {
  if (!buf || buf.length < 12) return 'png';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return 'png';
}

async function generateImage(options = {}) {
  loadEnv();

  const prompt = typeof options === 'string' ? options : options.prompt;
  if (!prompt || !prompt.trim()) {
    return {
      success: false,
      images: [],
      mediaTags: [],
      error: 'Prompt is required.'
    };
  }

  const baseUrl = (process.env.MAGPIE_BASE_URL || 'http://localhost:3425').replace(/\/+$/, '');
  const apiKey = (process.env.MAGPIE_API_KEY || '').trim();
  const defaultModel = (process.env.MAGPIE_IMAGE_MODEL || '').trim();
  const defaultSize = (process.env.DEFAULT_SIZE || '1024x1024').trim();
  const outDir = path.resolve(process.env.DEFAULT_OUTPUT_DIR || path.join(os.homedir(), '.cache', 'magpie_images'));

  if (!apiKey) {
    return {
      success: false,
      images: [],
      mediaTags: [],
      error: 'MAGPIE_API_KEY is not set in environment or .env file.'
    };
  }

  const targetSize = options.size || defaultSize;
  const targetModel = options.model || defaultModel;
  const rawN = parseInt(options.n, 10);
  const targetN = Number.isFinite(rawN) ? Math.max(1, Math.min(rawN, 4)) : 1;

  const payload = {
    prompt: prompt.trim(),
    n: targetN,
    size: targetSize
  };
  if (targetModel) {
    payload.model = targetModel;
  }

  const endpoint = `${baseUrl}/v1/images/generations`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'magpie-image-gen-skill'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300000)
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        images: [],
        mediaTags: [],
        error: `HTTP ${res.status}: ${errText}`
      };
    }

    const data = await res.json();
    const savedPaths = [];
    const mediaTags = [];
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const items = data.data || [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      let buf = null;
      if (item.b64_json) {
        buf = Buffer.from(item.b64_json, 'base64');
      } else if (item.url) {
        const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(60000) });
        if (!imgRes.ok) {
          return {
            success: false,
            images: savedPaths,
            mediaTags: mediaTags,
            error: `Failed to download image URL: HTTP ${imgRes.status}`
          };
        }
        buf = Buffer.from(await imgRes.arrayBuffer());
      } else {
        continue;
      }

      let savePath;
      if (options.outputPath && targetN === 1) {
        savePath = path.resolve(options.outputPath);
      } else {
        const rand = Math.random().toString(36).slice(2, 6);
        savePath = path.join(outDir, `img_${ts}_${idx + 1}_${rand}.${detectImageExt(buf)}`);
      }
      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, buf);
      savedPaths.push(savePath);
      mediaTags.push(`MEDIA:${savePath}`);
    }

    if (savedPaths.length === 0) {
      return {
        success: false,
        images: [],
        mediaTags: [],
        error: `生图接口未返回可用的图片数据（url/b64_json 均缺失），原始响应: ${JSON.stringify(data).slice(0, 500)}`
      };
    }

    return {
      success: true,
      images: savedPaths,
      mediaTags: mediaTags,
      rawResponse: data,
      error: null
    };

  } catch (err) {
    const isTimeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      success: false,
      images: [],
      mediaTags: [],
      error: isTimeout ? `请求超时（生图接口 300 秒 / 图片下载 60 秒）: ${endpoint}` : err.message
    };
  }
}

// 命令行直接运行入口
async function main() {
  const args = process.argv.slice(2);
  let prompt = '';
  let size = null;
  let n = 1;
  let model = null;
  let outputPath = null;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--size' || a === '-s') {
      size = args[++i];
    } else if (a === '--n' || a === '-n') {
      n = parseInt(args[++i], 10);
    } else if (a === '--model' || a === '-m') {
      model = args[++i];
    } else if (a === '--output' || a === '-o') {
      outputPath = args[++i];
    } else if (a === '--json') {
      jsonOutput = true;
    } else if (a.startsWith('--')) {
      console.error(`未知选项: ${a}`);
      process.exit(1);
    } else if (!prompt) {
      prompt = a;
    } else {
      console.error(`多余的参数（提示词请用引号包裹为一个参数）: ${a}`);
      process.exit(1);
    }
  }

  if (!prompt) {
    console.error('用法: node generate_image.js "画面提示词" [--size 1024x1024] [--n 1] [--output path.png]');
    process.exit(1);
  }

  if (!Number.isFinite(n)) {
    console.error('--n 需要是 1~4 的数字');
    process.exit(1);
  }

  if (outputPath && n > 1) {
    console.error('⚠ --output 仅在生成 1 张时生效，多张图片将使用自动文件名');
  }

  const res = await generateImage({
    prompt,
    size,
    n,
    model,
    outputPath
  });

  if (jsonOutput) {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  }

  if (!res.success) {
    console.error(`❌ 生图失败: ${res.error}`);
    process.exit(1);
  }

  for (let i = 0; i < res.images.length; i++) {
    console.log(`✅ 生成成功: ${res.images[i]}`);
    console.log(res.mediaTags[i]);
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = { generateImage };
}
