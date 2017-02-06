'use strict'

const _ = require('lodash')
const assert = require('assert')
const gatewayService = require('../index')
const request = require('request')
const https = require('https')
const should = require('should')
const fs = require('fs');

const gatewayPort = 8800
const port = 3300

var gateway
var server

const startGateway = (config, handler, done) => {
  const opts = {
    key: fs.readFileSync('./tests/server.key'),
    cert: fs.readFileSync('./tests/server.crt') 
  };
  server = https.createServer(opts, handler);

  server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url)

    gateway = gatewayService(config)

    done()
  })
}

describe('test configuration handling', () => {
  afterEach((done) => {
    if (gateway) {
      gateway.stop(() => {})
    }

    if (server) {
      server.close()
    }

    done()
  })

  describe('target', () => {
    describe('timeout of request', () => {
      it('can have the timeout of the request to target tweaked. Causing a 502 bad gateway.', (done) => {
        
        const baseConfig = {
          edgemicro: {
            port: gatewayPort,
            logging: { level: 'info', dir: './tests/log' },
            request_timeout: 1
          },
          proxies: [
            { base_path: '/v1', secure: false, url: 'http://localhost:' + port }
          ]
        }

        startGateway(baseConfig, (req, res) => {
          assert.equal('localhost:' + port, req.headers.host)
          res.end('OK')
        }, () => {
          gateway.start((err) => {
            assert.ok(!err, err)

            request({
              method: 'GET',
              url: 'http://localhost:' + gatewayPort + '/v1'
            }, (err, r, body) => {
              assert.ok(!err, err)
              assert.equal(r.statusCode, 502)
              done()
            })
          })
        })
      })

      it('can have the timeout of the request to target tweaked, and not interefere with the request response cycle.', (done) => {
        
        const baseConfig = {
          edgemicro: {
            port: gatewayPort,
            logging: { level: 'info', dir: './tests/log' },
            request_timeout: 10
          },
          proxies: [
            { base_path: '/v1', secure: false, url: 'http://localhost:' + port }
          ]
        }

        startGateway(baseConfig, (req, res) => {
          assert.equal('localhost:' + port, req.headers.host)
          res.end('OK')
        }, () => {
          gateway.start((err) => {
            assert.ok(!err, err)

            request({
              method: 'GET',
              url: 'http://localhost:' + gatewayPort + '/v1'
            }, (err, r, body) => {
              assert.ok(!err, err)
              assert.equal(r.statusCode, 502)
              done()
            })
          })
        })
      })
    })
  })
})
