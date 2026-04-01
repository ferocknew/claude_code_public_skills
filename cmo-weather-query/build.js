const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 生成时间戳版本号 YYMMDD.HHmmSS
const now = new Date();
const version = now.toISOString().slice(2, 10).replace(/[-:T]/g, '').replace(
  /(\d{6})(\d{6})/, '$1.$2'
).substring(0, 15);

console.log(`Building cmo-weather-query v${version}...`);

// 打包
esbuild.buildSync({
  entryPoints: ['run.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'skill.js',
  banner: {
    js: `// CMO Weather Query Skill v${version}\n// 中央气象台天气信息查询工具\n`
  }
});

// 更新 SKILL.md 中的版本号
const skillMdPath = path.join(__dirname, 'SKILL.md');
const skillMd = fs.readFileSync(skillMdPath, 'utf8');
const updated = skillMd.replace(
  /skill_version: .*/,
  `skill_version: ${version}`
);
fs.writeFileSync(skillMdPath, updated);

console.log(`✓ Build complete: skill.js (v${version})`);
