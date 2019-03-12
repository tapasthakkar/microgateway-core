const https = require('https');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const gatewayService = require('../index');
const path = require('path');
const { getJWTProm, getJWT } = require('./helper.js');
const edgeConfig = require('microgateway-config');
const server01 = require('./fixtures/server-crt01.js')(4433);
const server02 = require('./fixtures/server-crt02.js')(4434);
let { user, username, password, key, secret, org, env, tokenSecret, tokenId } = require('./env.js');
const request = require('request');
var gateway;
var jwtkn;
describe('Certificate Revocation List', () => {
  after(done => {
    gateway.stop();
    server01.close();
    server02.close();
    done();
  });
  describe('Server CRL', () => {
    it('Does not block valid certs', done => {
      edgeConfig.get(
        { keys: { key, secret }, source: path.join(__dirname, 'fixtures', 'crl-config.yaml') },
        (err, configDownload) => {
          config = configDownload;
          console.log('config', config);
          // delete config.edgemicro.plugins
          config.targets = [
            {
              host: 'localhost',
              ssl: {
                client: {
                  cert: __dirname + '/fixtures/client1-crt.pem',
                  key: __dirname + '/fixtures/client1-key.pem',
                  ca: __dirname + '/fixtures/ca-crt.pem',
                  crl: __dirname + '/fixtures/ca-crl.pem',
                  rejectUnauthorized: true
                }
              }
            }
          ];

          // config.proxies[0].url = "http://localhost:" + port + "/";
          // config.proxies[0].base_path = "/edgemicro_hello";
          // target = "http://localhost:" + config.edgemicro.port + '/edgemicro_hello';
          // agent.start(keys, null, config, done);
          // config = configDownload;
          gateway = gatewayService(config);
          gateway.start(function() {
            getJWT(function(tkn) {
              jwtkn = tkn;
              request(
                {
                  method: 'get',
                  uri: 'http://localhost:8000/edgemicro_crl01',
                  auth: {
                    bearer: tkn
                  }
                },
                (err, resp, body) => {
                  if (err) console.error('crl01 err', err);
                  assert.equal(err, null);
                  assert.equal(resp.statusCode, 200);
                  assert(body.includes('hello world valid'));
                  // if(console.log('body',body);
                  done();
                }
              );
            });
          });
        }
      );
    });

    it('Blocks revoked certs', done => {
      request(
        {
          method: 'get',
          uri: 'http://localhost:8000/edgemicro_crl02',
          auth: {
            bearer: jwtkn
          },
          json: true
        },
        (err, resp, body) => {
          if (err) console.error('crl02 err', err);
          if (resp) {
            console.log('resp.statusMessage', resp.statusMessage);
            console.log('resp.statusCode', resp.statusCode);
          }
          console.log('body', body);
          assert.equal(body.message, 'certificate revoked');
          assert.equal(body.code, 'CERT_REVOKED');
          done();
        }
      );
    });
  });
});
