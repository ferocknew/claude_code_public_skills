#!/usr/bin/env node

// Gitea REST API Client

const path = require('path');
const fs = require('fs');
const api = require('./lib/api');
const { parseArgs } = require('./lib/parser');
const output = require('./lib/output');
const cmd = require('./lib/cmd');

// Load .env file from skill directory
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
  console.log('Gitea REST API Client');
  console.log('');
  console.log('Usage: node skill.js <command> [subcommand] [options]');
  console.log('');
  console.log('Commands:');
  console.log('  packages list [--owner <name>] [--type <type>]  List packages');
  console.log('  system version                                   Get Gitea version');
  console.log('');
  console.log('Options:');
  console.log('  --format <type>   Output format: json, yaml, table, default (default: table)');
  console.log('  --limit <n>       Max results per owner (default: 50)');
  console.log('  --help, -h        Show this help');
  process.exit(0);
}

const fmt = parsed.format || 'table';

async function main() {
  const command = parsed.command;
  const sub = parsed.subcommand;

  switch (command) {
    case 'packages': {
      const result = await cmd.packages(parsed, api);
      output(result, fmt);
      break;
    }
    case 'system': {
      const result = await cmd.system(parsed, api);
      output(result, fmt);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run with --help for usage.');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
