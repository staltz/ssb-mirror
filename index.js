const http = require('http');
const ssbServer = require('./start-ssb');

http
  .createServer((req, res) => {
    res.end(JSON.stringify({invite: ssbServer.invite.get()}));
  })
  .listen(80);
