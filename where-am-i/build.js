const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 生成时间戳版本号
const now = new Date();
const version = String(
  now.getFullYear() - 2000
) +
  String(now.getMonth() + 1).padStart(2, '0') +
  String(now.getDate()).padStart(2, '0') +
  '.' +
  String(now.getHours()).padStart(2, '0') +
  String(now.getMinutes()).padStart(2, '0') +
  String(now.getSeconds()).padStart(2, '0');

console.log(`Building skill.js v${version}...`);

// 打包
esbuild
  .build({
    entryPoints: ['run.js'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'skill.js',
    banner: {
      js: `// Get My IP - v${version}\n// Generated at ${now.toISOString()}\n`,
    },
    define: {
      'process.env.SKILL_VERSION': `"${version}"`,
    },
  })
  .catch(() => process.exit(1));

// 更新 SKILL.md 中的版本号
const skillMdPath = path.join(__dirname, 'SKILL.md');
const skillMd = fs.readFileSync(skillMdPath, 'utf8');
const updated = skillMd.replace(/skill_version: .*/, `skill_version: ${version}`);
fs.writeFileSync(skillMdPath, updated);

console.log(`✓ Build complete: skill.js (v${version})`);
