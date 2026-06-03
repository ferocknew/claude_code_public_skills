// System commands

async function system(parsed, api) {
  const sub = parsed.subcommand;

  switch (sub) {
    case 'version': {
      return await api('/api/v1/version');
    }
    default:
      throw new Error(`Unknown system subcommand: ${sub}`);
  }
}

module.exports = system;
