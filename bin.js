#! /usr/bin/env node

const Client = require('ssb-client');
const manifest = require('./manifest');
const config = require('./config');

const lastArgv = process.argv[process.argv.length - 1];

if (lastArgv === 'start') {
  require('./index');
} else if (lastArgv === 'check') {
  // normal command:
  // create a client connection to the server

  var opts = {
    manifest: manifest,
    port: config.port,
    host: config.host || 'localhost',
    caps: config.caps,
    key: config.key || config.keys.id,
  };

  // connect
  Client(config.keys, opts, function(err, rpc) {
    if (err) {
      if (/could not connect/.test(err.message)) {
        console.error(
          'Error: Could not connect to ssb-server ' +
            opts.host +
            ':' +
            opts.port,
        );
        console.error('Use the "start" command to start it.');
        console.error('Use --verbose option to see full error');
        if (config.verbose) throw err;
        process.exit(1);
      }
      throw err;
    }

    process.stdout.write(rpc.whoami());
  });
}
