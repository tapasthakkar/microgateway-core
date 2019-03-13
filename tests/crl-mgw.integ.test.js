const https = require('https');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const gatewayService = require('../index');
const path = require('path');
const { getJWTProm, getJWT } = require('./helper.js');
const edgeConfig = require('microgateway-config');
let { user, username, password, key, secret, org, env, tokenSecret, tokenId } = require('./env.js');
var gateway;
var jwtkn;
let helloWorldSrv;
let helloWorldSrvPort = 4435;

describe('Certificate Revocation List', () => {
  before(done => {
    helloWorldSrv = http
      .createServer((req, res) => {
        res.end('hello world');
      })
      .listen(helloWorldSrvPort, () => {
        done();
      });
  });
  after(done => {
    gateway.stop();
    helloWorldSrv.close();
    done();
  });
  describe('MGW CRL', () => {
    it('MGW accepts connections with valid client cert', done => {
      edgeConfig.get(
        { keys: { key, secret }, source: path.join(__dirname, 'fixtures', 'crl-config.yaml') },
        (err, configDownload) => {
          config = configDownload;
          config.edgemicro.ssl = {
            cert: __dirname + '/fixtures/server-crt.pem',
            key: __dirname + '/fixtures/server-key.pem',
            ca: __dirname + '/fixtures/ca-crt.pem',
            crl: __dirname + '/fixtures/ca-crl.pem',
            requestCert: true,
            rejectUnauthorized: true
          };

          config.proxies[0].url = 'http://localhost:' + helloWorldSrvPort;
          config.proxies[0].base_path = '/hello_world';
          gateway = gatewayService(config);
          gateway.start(function() {
            getJWT(function(tkn) {
              jwtkn = tkn;
              let options = {
                hostname: 'localhost',
                port: 8000,
                path: '/hello_world',
                method: 'GET',
                key: fs.readFileSync(__dirname + '/fixtures/client1-key.pem'),
                cert: fs.readFileSync(__dirname + '/fixtures/client1-crt.pem'),
                ca: fs.readFileSync(__dirname + '/fixtures/ca-crt.pem'),
                headers: {
                  Authorization: `Bearer ${tkn}`
                }
              };
              let req = https.request(options, function(res) {
                let dataStr = '';
                res.on('data', function(data) {
                  dataStr += `${data}`;
                  if (dataStr.includes('hello world')) done();
                });
              });
              req.end();
              req.on('error', function(e) {
                assert.equal(e, null);
                done();
              });
            });
          });
        }
      );
    });

    it('Refuses connection with revoked client cert', done => {
      let options = {
        hostname: 'localhost',
        port: 8000,
        path: '/hello_world',
        method: 'GET',
        key: fs.readFileSync(__dirname + '/fixtures/client2-key.pem'),
        cert: fs.readFileSync(__dirname + '/fixtures/client2-crt.pem'),
        ca: fs.readFileSync(__dirname + '/fixtures/ca-crt.pem'),
        headers: {
          Authorization: `Bearer ${jwtkn}`
        }
      };
      let req = https.request(options, function(res) {
        let dataStr = '';
        res.on('data', function(data) {
          dataStr += `${data}`;
          if (dataStr.includes('hello world')) {
            assert(false);
            done();
          }
        });
      });
      req.end();
      req.on('error', function(e) {
        assert.notEqual(err, null);
        done();
      });
    });
  });
});
