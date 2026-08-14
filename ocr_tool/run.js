#!/usr/bin/env node
// run.js —— Windows OCR（tesseract.js）
// 用法: node run.js <图片路径> [--langs chi_sim+eng]
//
// 前提: 首次使用需安装依赖 → cd 到本目录执行 npm install
// 首次识别会自动下载语言数据包（chi_sim 约 22MB）到本地缓存，之后复用。
//
// 输出: 识别文本到 stdout；错误以 JSON { error } 输出到 stderr。
// 退出码: 0 成功, 1 图片不存在/识别失败, 2 参数错误

const fs = require('fs');
const path = require('path');

function usage() {
  console.error('用法: node run.js <图片路径> [--langs chi_sim+eng]');
}

function parseArgs(argv) {
  const opts = { image: null, langs: 'chi_sim+eng' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--langs') {
      opts.langs = argv[++i] || opts.langs;
    } else if (a === '--help' || a === '-h') {
      usage();
      process.exit(0);
    } else if (!a.startsWith('-') && !opts.image) {
      opts.image = a;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.image) {
    usage();
    process.exit(2);
  }

  const imgPath = path.resolve(opts.image);
  if (!fs.existsSync(imgPath)) {
    console.error(JSON.stringify({ error: `图片不存在: ${imgPath}` }));
    process.exit(1);
  }

  let Tesseract;
  try {
    Tesseract = require('tesseract.js');
  } catch (e) {
    console.error(JSON.stringify({
      error: '未找到 tesseract.js，请先安装依赖: cd <ocr_tool目录> && npm install',
    }));
    process.exit(1);
  }

  const { data } = await Tesseract.recognize(imgPath, opts.langs, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stderr.write(`\r识别进度: ${(m.progress * 100).toFixed(0)}%`);
      }
    },
  });
  process.stderr.write('\n');
  console.log((data.text || '').trim());
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
