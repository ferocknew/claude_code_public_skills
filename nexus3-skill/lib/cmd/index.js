// 命令分发器

const statusCmd = require('./status');
const reposCmd = require('./repos');
const componentsCmd = require('./components');
const dockerCmd = require('./docker');
const assetsCmd = require('./assets');

module.exports = {
  status: statusCmd,
  repos: reposCmd,
  components: componentsCmd,
  docker: dockerCmd,
  assets: assetsCmd,
};
