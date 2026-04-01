const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const now = new Date();
const version = now.toISOString().slice(2, 10).replace(/[-:T]/g, '').replace(
  /(\d{6})(\d{6})/, '$1.$2'
).substring(0, 15);

console.log(`Building where-is-this v${version}...`);

esbuild.buildSync({
  entryPoints: ['run.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'skill.js',
  banner: {
    js: `// Where Is This Skill v${version}\n// 逆地理编码工具\n`
  }
});

const skillMdPath = path.join(__dirname, 'SKILL.md');
const skillMd = fs.readFileSync(skillMdPath, 'utf8');
const updated = skillMd.replace(
  /skill_version: .*/,
  `skill_version: ${version}`
);
fs.writeFileSync(skillMdPath, updated);

console.log(`✓ Build complete: skill.js (v${version})`);
