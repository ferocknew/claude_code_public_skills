// Argument parser

function parseArgs(argv) {
  const result = {
    command: null,
    subcommand: null,
    owner: null,
    type: null,
    format: null,
    limit: null,
    help: false,
    _: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--owner' && argv[i + 1]) {
      result.owner = argv[++i];
    } else if (arg === '--type' && argv[i + 1]) {
      result.type = argv[++i];
    } else if (arg === '--format' && argv[i + 1]) {
      result.format = argv[++i];
    } else if (arg === '--limit' && argv[i + 1]) {
      result.limit = parseInt(argv[++i], 10);
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
