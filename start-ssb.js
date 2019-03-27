const ssbServer = require('ssb-server/index')
  .use(require('ssb-server/plugins/master'))
  .use(require('ssb-server/plugins/logging'))
  .use(require('ssb-legacy-conn'))
  .use(require('ssb-replicate'))
  .use(require('ssb-blobs'))
  .use(require('./mirror-invite'))
  .call(null, require('./config'));

module.exports = ssbServer;
