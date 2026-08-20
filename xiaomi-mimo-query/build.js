const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 生成版本时间戳（YYMMDD.HHmmSS）
const now = new Date();
const version = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

// esbuild 打包为零依赖 skill.js
esbuild.build({
  entryPoints: ['run.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'skill.js',
  banner: { js: `// Xiaomi MiMo Usage Skill v${version}` },
  define: { __VERSION: `"${version}"` },
}).then(() => {
  console.log(`Built skill.js v${version}`);

  // 自动更新 SKILL.md 的 skill_version
  const skillMdPath = path.join(__dirname, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    let content = fs.readFileSync(skillMdPath, 'utf-8');
    if (content.includes('skill_version:')) {
      content = content.replace(/skill_version: .+/, `skill_version: ${version}`);
    } else {
      content = content.replace(/^(description: .+\n)/m, `$1skill_version: ${version}\n`);
    }
    fs.writeFileSync(skillMdPath, content);
    console.log(`Updated SKILL.md skill_version: ${version}`);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});