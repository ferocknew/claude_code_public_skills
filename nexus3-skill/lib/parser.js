// 参数解析器

function parseArgs(argv) {
  const result = {
    command: null,
    subcommand: null,
    repo: null, // 仓库名
    name: null, // 组件/包名
    version: null, // 版本（npm/pypi 包版本，也作通用版本过滤）
    tag: null, // docker tag
    image: null, // docker 镜像名（等价 name）
    group: null, // 分组（npm scope / maven groupId / docker 路径前缀）
    format: null, // 仓库格式过滤：docker/npm/pypi/maven2/raw/nuget...
    limit: null, // 分页上限
    id: null, // 直接指定 component/asset id
    yes: false, // 跳过删除确认（真正执行删除）
    allTags: false, // docker 删除所有 tag
    raw: false, // 输出原始完整 JSON（不做字段精简）
    help: false,
    _: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if ((arg === '--repo' || arg === '-r') && next !== undefined && !next.startsWith('-')) {
      result.repo = argv[++i];
    } else if ((arg === '--name' || arg === '-n') && next !== undefined && !next.startsWith('-')) {
      result.name = argv[++i];
    } else if ((arg === '--version' || arg === '-v') && next !== undefined && !next.startsWith('-')) {
      result.version = argv[++i];
    } else if (arg === '--tag' && next !== undefined && !next.startsWith('-')) {
      result.tag = argv[++i];
    } else if (arg === '--image' && next !== undefined && !next.startsWith('-')) {
      result.image = argv[++i];
    } else if ((arg === '--group' || arg === '-g') && next !== undefined && !next.startsWith('-')) {
      result.group = argv[++i];
    } else if (arg === '--format' && next !== undefined && !next.startsWith('-')) {
      result.format = argv[++i];
    } else if (arg === '--limit' && next !== undefined) {
      const n = parseInt(next, 10);
      if (!Number.isNaN(n)) {
        result.limit = n;
        i++;
      }
    } else if (arg === '--id' && next !== undefined && !next.startsWith('-')) {
      result.id = argv[++i];
    } else if (arg === '--yes' || arg === '-y') {
      result.yes = true;
    } else if (arg === '--all-tags' || arg === '--all') {
      result.allTags = true;
    } else if (arg === '--raw') {
      result.raw = true;
    } else if (!result.command) {
      result.command = arg;
    } else if (!result.subcommand) {
      result.subcommand = arg;
    } else {
      result._.push(arg);
    }
  }

  return result;
}

module.exports = { parseArgs };
