/// <reference path="../../../typings/node/node.d.ts" />
/// <reference path="../../../typings/mocha/mocha.d.ts" />
/// <reference path="../../../typings/chai/chai.d.ts" />

'use strict';

var fs = require('fs');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var debug = require('debug')('gateway:logging-test');

describe('logging', function() {

  process.env.NODE_ENV = 'test';

  var message = 'log_message';

  var config = {
    uid: process.pid,
    edgemicro: {
      port: 8000,
      logging: {
        level: 'info',
        dir: './tests/log'
      }
    }
  };

  var log;

  beforeEach(function(done) {
    var logging = require('../lib/logging');
    logging.init(config);
    log = logging.getLogger();
    done();
  });

  it('info', function(done) {
    config.edgemicro.logging.level = 'info';
    ['info', 'warn', 'error'].forEach(function(level) {
      var text = log[level](message);
      expect(text).to.not.be.null;
      var record = text.trim().split(' ');
      debug(record);
      record.length.should.equal(3);
      record[0].should.be.a.number;
      record[1].should.equal(level);
      record[2].should.equal(message);
    });
    done();
  });

  it('warn', function(done) {
    config.edgemicro.logging.level = 'warn';
    ['warn', 'error'].forEach(function(level) {
      var text = log[level](message);
      expect(text).to.not.be.null;
      var record = text.trim().split(' ');
      debug(record);
      record.length.should.equal(3);
      record[0].should.be.a.number;
      record[1].should.equal(level);
      record[2].should.equal(message);
    });
    ['info'].forEach(function(level) {
      var text = log[level](message);
      expect(text).to.be.null;
    });
    done();
  });


  it('error', function(done) {
    config.edgemicro.logging.level = 'error';
    ['error'].forEach(function(level) {
      var text = log[level](message);
      expect(text).to.not.be.null;
      var record = text.trim().split(' ');
      debug(record);
      record.length.should.equal(3);
      record[0].should.be.a.number;
      record[1].should.equal(level);
      record[2].should.equal(message);
    });
    ['info', 'warn'].forEach(function(level) {
      var text = log[level](message);
      expect(text).to.be.null;
    });
    done();
  });

});
