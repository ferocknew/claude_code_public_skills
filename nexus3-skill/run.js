#!/usr/bin/env node

// Nexus3 REST API 客户端

const path = require('path');
const fs = require('fs');
const api = require('./lib/api');
const { parseArgs } = require('./lib/parser');
const output = require('./lib/output');
const cmd = require('./lib/cmd');

// 加载 skill 同目录下的 .env（不覆盖已存在的环境变量）
const envPath = path.join(__dirname, '.env');
try {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^(\w+)=(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (_) {}

const argv = process.argv.slice(2);
const parsed = parseArgs(argv);

if (parsed.help || argv.length === 0) {
  console.log('Nexus3 REST API 客户端');
  console.log('');
  console.log('Usage: node skill.js <command> [subcommand] [options]');
  console.log('');
  console.log('命令总览：');
  console.log('  status [info|check]                       服务器状态/健康检查');
  console.log('  repos list [--format <fmt>]               列出所有仓库');
  console.log('');
  console.log('  components list   --repo <repo> [--limit n]                       列出仓库组件');
  console.log('  components search --repo <repo> --name <n> [--version v] [-g g]  搜索组件');
  console.log('  components get    --id <id>                                      组件详情');
  console.log('  components delete --repo <repo> --name <n> [--version v] [-g g]  删除组件（npm/pypi/maven/raw 通用）');
  console.log('             也可直接：components delete --id <id>');
  console.log('');
  console.log('  docker rm    --repo <repo> --image <img> --tag <t>   删除 docker 镜像指定 tag（逗号分隔多个）');
  console.log('  docker rm    --repo <repo> --image <img> --all-tags  删除 docker 镜像全部 tag');
  console.log('  docker tags  --repo <repo> --image <img>             列出镜像所有 tag');
  console.log('');
  console.log('  assets list   --repo <repo> [--limit n]   列出资产');
  console.log('  assets delete --id <id>                   删除资产');
  console.log('');
  console.log('⚠️  删除安全机制：所有删除命令默认「预览模式」（dry-run），加 --yes 才真正执行。');
  console.log('');
  console.log('选项：');
  console.log('  --repo, -r <name>   仓库名');
  console.log('  --name, -n <name>   组件/镜像/包名');
  console.log('  --image <name>      docker 镜像名（等同 --name）');
  console.log('  --tag <t>           docker tag（逗号分隔可多个）');
  console.log('  --version, -v <ver> 版本（npm/pypi 包版本 / docker tag / maven 版本）');
  console.log('  --group, -g <g>     分组（npm scope / maven groupId）');
  console.log('  --id <id>           直接指定 component/asset id');
  console.log('  --format <fmt>      仓库格式过滤：docker/npm/pypi/maven2/raw/nuget...（repos list）');
  console.log('  --limit <n>         分页上限（默认 50）');
  console.log('  --yes, -y           真正执行删除（默认预览）');
  console.log('  --all-tags, --all   删除 docker 镜像全部 tag');
  console.log('  --raw               输出原始完整 JSON（不做字段精简）');
  console.log('  --help, -h          显示本帮助');
  process.exit(0);
}

const fmt = parsed.raw ? 'json' : 'table';

async function main() {
  const command = parsed.command;

  switch (command) {
    case 'status':
      return output(await cmd.status(parsed, api), fmt);
    case 'repos':
    case 'repositories':
      return output(await cmd.repos(parsed, api), fmt);
    case 'components':
    case 'component':
    case 'comp':
      return output(await cmd.components(parsed, api), fmt);
    case 'docker':
      return output(await cmd.docker(parsed, api), fmt);
    case 'assets':
    case 'asset':
      return output(await cmd.assets(parsed, api), fmt);
    default:
      console.error(`未知命令：${command}`);
      console.error('运行 --help 查看用法。');
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
