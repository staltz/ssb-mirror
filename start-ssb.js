const Config = require('ssb-config/inject');
const manifest = require('./manifest');

const config = Config('ssb', {
  manifest: manifest,
  logging: {level: 'info'},
  port: 8008,
  host: '0.0.0.0',
  replicate: {
    legacy: true, // We don't need EBT because there is no pub-to-pub comms
  },
  connections: {
    incoming: {
      net: [{scope: 'public', transform: 'shs', port: 8008}],
    },
    outgoing: {
      net: [{transform: 'shs'}],
    },
  },
});

const ssbServer = require('ssb-server/index')
  .use(require('ssb-server/plugins/master'))
  .use(require('ssb-server/plugins/logging'))
  .use(require('ssb-legacy-conn'))
  .use(require('ssb-replicate'))
  .use(require('ssb-blobs'))
  .use(require('./mirror-invite'))
  .call(null, config);

module.exports = ssbServer;
