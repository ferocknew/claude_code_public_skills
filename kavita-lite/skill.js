#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. 加载环境变量 (.env)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!env[key]) env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const KAVITA_URL = (env.KAVITA_URL || '').replace(/\/+$/, '');
const KAVITA_API_KEY = env.KAVITA_API_KEY || '';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Referer': 'https://book.douban.com/'
};
if (env.DOUBAN_COOKIE) {
  HEADERS['Cookie'] = env.DOUBAN_COOKIE;
}

// 2. 豆瓣图书 API 与页面抓取
async function searchDouban(query) {
  const url = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      throw new Error(`豆瓣建议接口返回 HTTP ${res.status}`);
    }
    const list = await res.json();
    return list.map(item => ({
      id: item.id,
      title: item.title,
      author: item.author_name,
      year: item.year,
      url: item.url,
      cover: (item.pic || '').replace('/s/public/', '/l/public/')
    }));
  } catch (err) {
    console.error(`[searchDouban] 搜索接口异常: ${err.message}`);
    return [];
  }
}

async function getDoubanDetail(subjectIdOrUrl) {
  let id = subjectIdOrUrl;
  if (typeof id === 'string' && id.includes('douban.com/subject/')) {
    const match = id.match(/subject\/(\d+)/);
    if (match) id = match[1];
  }
  const url = `https://book.douban.com/subject/${id}/`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`抓取豆瓣详情页失败: HTTP ${res.status} (url: ${url})`);
  }
  const html = await res.text();

  // 标题
  let title = '';
  const titleMatch = html.match(/<span property="v:itemreviewed">([\s\S]*?)<\/span>/);
  if (titleMatch) title = titleMatch[1].trim();

  // 封面大图
  let cover = '';
  const coverMatch = html.match(/<a class="nbg"[^>]+href="([^"]+)"/);
  if (coverMatch) {
    cover = coverMatch[1];
  } else {
    const m2 = html.match(/<img[^>]+rel="v:photo"[^>]+src="([^"]+)"/);
    if (m2) cover = m2[1].replace('/s/public/', '/l/public/').replace('/m/public/', '/l/public/');
  }

  // 简介提取 (支持展开后的完整 intro)
  let summary = '';
  const allIntroMatch = html.match(/<span class="short">[\s\S]*?<\/span>\s*<span class="all hidden">([\s\S]*?)<\/span>/);
  if (allIntroMatch) {
    summary = cleanHtml(allIntroMatch[1]);
  } else {
    const introMatch = html.match(/<h2><span class="[^>]*">内容简介[\s\S]*?<div class="intro">([\s\S]*?)<\/div>/);
    if (introMatch) {
      summary = cleanHtml(introMatch[1]);
    } else {
      const fallbackIntro = html.match(/<div class="intro">([\s\S]*?)<\/div>/);
      if (fallbackIntro) summary = cleanHtml(fallbackIntro[1]);
    }
  }

  // 信息区 (作者、出版社、出版年、ISBN 等)
  const infoBlockMatch = html.match(/<div id="info"[^>]*>([\s\S]*?)<\/div>/);
  const infoText = infoBlockMatch ? infoBlockMatch[1] : '';

  const authorMatch = infoText.match(/<span class="pl">\s*作者<\/span>:([\s\S]*?)<br/);
  const author = authorMatch ? cleanHtml(authorMatch[1]).replace(/\s+/g, ' ').trim() : '';

  const publisherMatch = infoText.match(/<span class="pl">\s*出版社:<\/span>([\s\S]*?)<br/);
  const publisher = publisherMatch ? cleanHtml(publisherMatch[1]).replace(/\s+/g, ' ').trim() : '';

  const pubYearMatch = infoText.match(/<span class="pl">\s*出版年:<\/span>([\s\S]*?)<br/);
  const pubYear = pubYearMatch ? cleanHtml(pubYearMatch[1]).replace(/\s+/g, ' ').trim() : '';

  const isbnMatch = infoText.match(/<span class="pl">\s*ISBN:<\/span>([\s\S]*?)<br/);
  const isbn = isbnMatch ? cleanHtml(isbnMatch[1]).replace(/\s+/g, ' ').trim() : '';

  const pagesMatch = infoText.match(/<span class="pl">\s*页数:<\/span>([\s\S]*?)<br/);
  const pages = pagesMatch ? cleanHtml(pagesMatch[1]).replace(/\s+/g, ' ').trim() : '';

  // 豆瓣标签
  const tags = [];
  const tagMatches = html.matchAll(/class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/a>/g);
  for (const m of tagMatches) {
    const t = cleanHtml(m[1]).trim();
    if (t && !tags.includes(t) && t.length < 20) tags.push(t);
  }

  // 豆瓣评分
  let rating = 0;
  const ratingMatch = html.match(/property="v:average"[^>]*>([\s\S]*?)<\/strong>/);
  if (ratingMatch) rating = parseFloat(ratingMatch[1].trim()) || 0;

  return {
    id,
    title,
    author: author ? cleanHtml(author) : '',
    publisher: publisher ? cleanHtml(publisher) : '',
    pubYear: pubYear ? cleanHtml(pubYear).trim() : '',
    isbn: isbn ? cleanHtml(isbn).trim() : '',
    pages: pages ? cleanHtml(pages).trim() : '',
    tags,
    rating,
    cover,
    summary,
    url
  };
}

function cleanHtml(str) {
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function extractField(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : '';
}

// 3. Kavita 客户端类
class KavitaClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.token = null;
  }

  async authenticate() {
    if (this.token) return this.token;
    const url = `${this.baseUrl}/api/Plugin/authenticate?apiKey=${encodeURIComponent(this.apiKey)}&pluginName=kavita-lite`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Kavita API 鉴权失败: HTTP ${res.status} (请检查 KAVITA_API_KEY)`);
    }
    const data = await res.json();
    this.token = data.token;
    return this.token;
  }

  async request(path, options = {}) {
    await this.authenticate();
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Kavita 请求 ${path} 失败: HTTP ${res.status} ${errText}`);
    }
    const cType = res.headers.get('content-type') || '';
    if (cType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  }

  async getSeriesList(libraryId = null) {
    const list = await this.request('/api/Series/all-v2', {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!libraryId) return list;
    return list.filter(s => s.libraryId === parseInt(libraryId));
  }

  async findSeries(nameOrId) {
    const id = parseInt(nameOrId);
    if (!isNaN(id)) {
      try {
        const metadata = await this.request(`/api/Series/metadata?seriesId=${id}`);
        return { id, name: metadata.name || `Series #${id}`, seriesMetadata: metadata };
      } catch (e) {}
    }
    // 按名称搜索
    const list = await this.getSeriesList();
    const query = String(nameOrId).toLowerCase().trim();
    return list.find(s => s.name.toLowerCase() === query || s.originalName?.toLowerCase() === query) ||
           list.find(s => s.name.toLowerCase().includes(query));
  }

  async getMetadata(seriesId) {
    return await this.request(`/api/Series/metadata?seriesId=${seriesId}`);
  }

  async updateMetadata(seriesId, newMetadata) {
    const current = await this.getMetadata(seriesId);
    const seriesMeta = {
      ...current,
      ...newMetadata,
      seriesId: parseInt(seriesId),
      summaryLocked: true
    };
    const payload = {
      seriesMetadata: seriesMeta
    };
    return await this.request('/api/Series/metadata', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async uploadCover(seriesId, imageUrl) {
    // 1. 下载图片并转成 Base64
    const imgRes = await fetch(imageUrl, { headers: HEADERS });
    if (!imgRes.ok) {
      throw new Error(`下载封面失败: HTTP ${imgRes.status}`);
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // 2. 发送给 Kavita POST /api/Upload/series
    const payload = {
      id: parseInt(seriesId),
      url: base64,
      lockCover: true
    };
    return await this.request('/api/Upload/series', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

// 4. CLI 命令处理
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  switch (cmd) {
    case 'search': {
      const q = args.slice(1).join(' ');
      if (!q) {
        console.error('用法: node skill.js search <书名/作者/ISBN>');
        process.exit(1);
      }
      console.log(`🔎 正在豆瓣搜索: "${q}"...`);
      const results = await searchDouban(q);
      if (results.length === 0) {
        console.log('未找到相关书籍。');
        return;
      }
      console.log(`找到 ${results.length} 条记录:`);
      results.forEach((r, i) => {
        console.log(`[${i + 1}] 《${r.title}》 ID: ${r.id} | 作者: ${r.author || '未知'} | 年份: ${r.year || '未知'}`);
        console.log(`    URL: ${r.url}`);
        console.log(`    封面: ${r.cover}`);
      });
      break;
    }

    case 'get': {
      const target = args[1];
      if (!target) {
        console.error('用法: node skill.js get <豆瓣ID或书名>');
        process.exit(1);
      }
      let subjectId = target;
      if (!/^\d+$/.test(target)) {
        console.log(`正在按书名 "${target}" 搜索豆瓣 ID...`);
        const searchList = await searchDouban(target);
        if (searchList.length === 0) {
          console.error('未搜索到对应书籍。');
          process.exit(1);
        }
        subjectId = searchList[0].id;
        console.log(`匹配到最佳条目: 《${searchList[0].title}》 (ID: ${subjectId})`);
      }
      console.log(`📥 抓取豆瓣详情 (ID: ${subjectId})...`);
      const detail = await getDoubanDetail(subjectId);
      console.log('\n' + '='.repeat(50));
      console.log(`书名: 《${detail.title}》`);
      console.log(`作者: ${detail.author}`);
      console.log(`出版社: ${detail.publisher} (${detail.pubYear})`);
      console.log(`ISBN: ${detail.isbn}`);
      console.log(`评分: ⭐ ${detail.rating}`);
      console.log(`标签: ${detail.tags.join(', ')}`);
      console.log(`封面: ${detail.cover}`);
      console.log(`简介:\n${detail.summary}`);
      console.log('='.repeat(50));
      break;
    }

    case 'sync': {
      const target = args[1];
      const doubanHint = args[2];
      if (!target) {
        console.error('用法: node skill.js sync <Kavita书名或SeriesId> [豆瓣ID或书名]');
        process.exit(1);
      }
      if (!KAVITA_URL || !KAVITA_API_KEY) {
        console.error('❌ 错误: .env 未配置 KAVITA_URL 或 KAVITA_API_KEY，无法回填至 Kavita！');
        process.exit(1);
      }
      const kavita = new KavitaClient(KAVITA_URL, KAVITA_API_KEY);
      console.log(`🔗 连接 Kavita: ${KAVITA_URL}...`);
      const series = await kavita.findSeries(target);
      if (!series) {
        console.error(`❌ 未在 Kavita 中找到书籍/系列: "${target}"`);
        process.exit(1);
      }
      console.log(`✅ 找到 Kavita 系列: 《${series.name}》 (SeriesId: ${series.id})`);

      // 搜索豆瓣
      const searchQuery = doubanHint || series.name;
      console.log(`🔎 抓取豆瓣数据 (关键词: "${searchQuery}")...`);
      let subjectId = doubanHint;
      if (!subjectId || !/^\d+$/.test(subjectId)) {
        const results = await searchDouban(searchQuery);
        if (results.length === 0) {
          console.error('❌ 豆瓣未检索到匹配书籍，请手动指定豆瓣 ID: node skill.js sync <书名> <豆瓣ID>');
          process.exit(1);
        }
        subjectId = results[0].id;
        console.log(`🎯 匹配豆瓣书目: 《${results[0].title}》 (ID: ${subjectId})`);
      }

      const detail = await getDoubanDetail(subjectId);
      console.log(`📖 获取到简介 (${detail.summary ? detail.summary.length + ' 字' : '无'})`);

      // 1. 回填简介与标签
      console.log('📝 正在更新 Kavita 元数据...');
      const metaUpdates = {
        summary: detail.summary || '',
        summaryLocked: true
      };
      if (detail.pubYear) {
        const yearInt = parseInt(detail.pubYear);
        if (!isNaN(yearInt)) {
          metaUpdates.releaseYear = yearInt;
          metaUpdates.releaseYearLocked = true;
        }
      }
      if (detail.tags && detail.tags.length > 0) {
        metaUpdates.tags = detail.tags.slice(0, 8).map(t => ({ title: t }));
        metaUpdates.tagsLocked = true;
      }
      await kavita.updateMetadata(series.id, metaUpdates);
      console.log('✅ 元数据与简介已成功回填并锁定！');

      // 2. 回填封面
      if (detail.cover) {
        console.log(`🎨 正在抓取并回填高清封面: ${detail.cover}...`);
        try {
          await kavita.uploadCover(series.id, detail.cover);
          console.log('✅ 封面已成功上传并锁定！');
        } catch (e) {
          console.warn(`⚠️ 封面上传警告: ${e.message}`);
        }
      }
      console.log(`\n🎉 搞定！《${series.name}》信息与封面已全部同步完成！`);
      break;
    }

    case 'kavita-list': {
      if (!KAVITA_URL || !KAVITA_API_KEY) {
        console.error('❌ 错误: .env 未配置 KAVITA_URL 或 KAVITA_API_KEY！');
        process.exit(1);
      }
      const libId = args[1] || '8';
      const kavita = new KavitaClient(KAVITA_URL, KAVITA_API_KEY);
      console.log(`📚 获取 Kavita 库 (ID: ${libId}) 书籍清单...`);
      const list = await kavita.getSeriesList(libId);
      console.log(`共 ${list.length} 本藏书:`);
      for (const s of list) {
        const meta = await kavita.getMetadata(s.id);
        const hasSummary = meta.summary && meta.summary.trim().length > 0;
        console.log(`- [${s.id}] 《${s.name}》 | 简介: ${hasSummary ? '✅ 已有' : '⚪ 空白'} | 年份: ${meta.releaseYear || '-'}`);
      }
      break;
    }

    default:
      console.error(`未知命令: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
📚 kavita-lite - 豆瓣图书简介与封面抓取及 Kavita 回填工具

用法:
  node skill.js search <关键词>                     搜索豆瓣图书条目
  node skill.js get <豆瓣ID或书名>                  获取图书完整元数据 (简介/封面/标签)
  node skill.js sync <Kavita书名或ID> [豆瓣ID]      抓取豆瓣并回填至 Kavita 书库 (简介+封面)
  node skill.js kavita-list [LibraryId]             查看 Kavita 书库书籍的元数据完备情况

环境变量 (.env):
  KAVITA_URL       Kavita 实例地址 (例如 http://127.0.0.1:5000)
  KAVITA_API_KEY   Kavita API Key (可在 Kavita 个人中心生成)
  DOUBAN_COOKIE    可选豆瓣 Cookie (防频繁请求封禁)
`);
}

main().catch(err => {
  console.error('运行错误:', err);
  process.exit(1);
});
