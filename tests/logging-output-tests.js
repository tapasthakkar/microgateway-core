'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const util = require('util');
const os = require('os');
var chai = require('chai');
var expect = chai.expect;
var debug = require('debug')('gateway:logging-test');

describe('logging', function() {
  process.env.NODE_ENV = 'test';
  var config = {
    uid: '1',
    edgemicro: {
      port: 8000,
      logging: {
        level: 'info',
        dir: './tests/log',
        rotate_interval: 24
      }
    }
  };
  var logging;
  //  = require('../lib/logging');

  var log;
  beforeEach(function(done) {
    logging = require('../lib/logging');
    logging.init(config);
    log = logging.getLogger();
    done();
  });

  afterEach(function(done) {
    //List all files in the test logs and get rid of em.
    const logDirPath = './tests/log';
    var files = fs.readdirSync('./tests/log');
    files.forEach(f => {
      if (fs.existsSync(path.join(logDirPath, f))) fs.unlinkSync(path.join(logDirPath, f));
    });
    done();
  });

  it('exposes a _calculateLogFilePath function', () => {
    assert.ok(logging._calculateLogFilePath);
  });

  it('will calculate a file path for a log in a consistent way', () => {
    var filePath = logging._calculateLogFilePath('./tests/log', '1', 1);
    assert.equal(filePath, path.join('./tests/log', util.format('edgemicro-%s-%s-%d-api.log', os.hostname(), '1', 1)));
  });

  it('will log to a file', () => {
    var whereToFindLog = logging._calculateLogFilePath('./tests/log', '1', 1);
    log.writeLogRecord({ level: 'info', msg: 'foo' });
    var content = fs.readFileSync(whereToFindLog);
    assert.equal(content.toString(), 'foo');
  });

  it('will log multiple messages to file', done => {
    var whereToFindLog = logging._calculateLogFilePath('./tests/log', '1', 1);
    log.writeLogRecord({ level: 'info', msg: 'foo1' });
    log.writeLogRecord({ level: 'info', msg: 'foo2' });
    //A small work around for ensuring that write buffers are cleared to files before checking if data is present in logs.
    setTimeout(() => {
      console.log('whereToFindLog', whereToFindLog);
      var content = fs.readFileSync(whereToFindLog, 'utf8');
      console.log('content', content);
      assert.deepStrictEqual(content, 'foo1foo2');
      done();
    }, 100);
  });
});
