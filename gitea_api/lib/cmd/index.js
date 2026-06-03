// Command dispatcher

const packagesCmd = require('./packages');
const systemCmd = require('./system');

module.exports = {
  packages: packagesCmd,
  system: systemCmd,
};
