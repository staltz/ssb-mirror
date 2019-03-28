const fs = require('fs');
const path = require('path');
const express = require('express');
const mime = require('mime-types');
const pull = require('pull-stream');
const toPull = require('stream-to-pull-stream');
const ident = require('pull-identify-filetype');
const qr = require('qr-image');
const debug = require('debug')('ssb:mirror:http');

module.exports = function startHTTP(ssbServer) {
  const app = express();
  app.use(express.static(__dirname + '/assets'));
  app.use(require('body-parser').urlencoded({extended: true}));
  app.set('port', 8007);
  app.set('views', __dirname + '/pages');
  app.set('view engine', 'ejs');

  const feedFilePath = path.join(ssbServer.config.path, 'mirror');

  app.get('/', (_req, res) => {
    const invite = ssbServer.invite.get();
    const qrCode = qr.svgObject(invite);
    fs.access(feedFilePath, fs.constants.F_OK, doesNotExist => {
      if (doesNotExist) {
        res.render('setup', {
          invite: invite,
          qrSize: qrCode.size,
          qrPath: qrCode.path,
        });
      } else {
        ssbServer.about.socialValue(
          {key: 'name', dest: ssbServer.id},
          (err1, name) => {
            if (err1) name = null;
            ssbServer.about.socialValue(
              {key: 'image', dest: ssbServer.id},
              (err2, val) => {
                let image = val;
                if (err2) image = null;
                if (!!val && typeof val === 'object' && val.link)
                  image = val.link;

                ssbServer.blobs.has(image, (err3, has) => {
                  if (err3 || !has) image = null;

                  res.render('index', {
                    id: ssbServer.id,
                    name: name,
                    image: image,
                    invite: invite,
                    qrSize: qrCode.size,
                    qrPath: qrCode.path,
                  });
                });
              },
            );
          },
        );
      }
    });
  });

  app.get('/avatar', (req, res) => {
    ssbServer.about.socialValue(
      {key: 'image', dest: ssbServer.id},
      (err, val) => {
        if (err) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        let image = val;
        if (!!val && typeof val === 'object' && val.link) image = val.link;

        pull(
          ssbServer.blobs.get(image),
          ident(type => {
            if (type) res.writeHead(200, {'Content-Type': mime.lookup(type)});
          }),
          toPull.sink(res),
        );
      },
    );
    // ssbServer.blobs.has(hash, function(err, has) {
    //   if (err) return cb(err);
    //   if (has) {
    //     cb(null, has);
    //   } else {
    //     ssbServer.blobs.want(hash, cb);
    //   }
    // });
  });

  return app.listen(app.get('port'), () => {
    debug('Express app is running on port %s', app.get('port'));
  });
};
