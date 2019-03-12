'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
module.exports = function(port) {
  var options = {
    key: fs.readFileSync(path.join(__dirname, 'server-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'server-crt.pem')),
    // key: fs.readFileSync('client2-key.pem'),
    // cert: fs.readFileSync('client2-crt.pem'),
    ca: fs.readFileSync(path.join(__dirname, 'ca-crt.pem')),
    // crl: fs.readFileSync('ca-crl.pem'),
    requestCert: true,
    rejectUnauthorized: true
  };

  let srv = https
    .createServer(options, function(req, res) {
      // console.log('req.socket.getPeerCertificate()', req.socket.getPeerCertificate());

      console.log(
        new Date() +
          ' ' +
          req.connection.remoteAddress +
          ' ' +
          req.socket.getPeerCertificate().subject.CN +
          ' ' +
          req.method +
          ' ' +
          req.url
      );
      res.writeHead(200);
      res.end('hello world valid\n');
    })
    .listen(port);
  return srv;
};
