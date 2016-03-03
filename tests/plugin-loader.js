'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var debug = require('debug')('gateway:pluginloader-test');
var gatewayService = require('../index');
var serverLib = require('./hello_rest/index');

describe('plugin loader', function () {
  process.env.NODE_ENV = 'test';
  var config = {};
  var gateway;
  var server = serverLib({test: {echo: "test"}});
  config = {
    uid: process.pid,
    edgemicro: {
      logging: {level: 'info',dir:'./tests/log'},
      port: 8000
    }
  };
  beforeEach(function (done) {
    var key = '5445192f945523589f648c2a49e783c5ce372339114dc95b87d2d2741044b749';
    var secret = 'ab09a7b2cf96bcf9b377b30a4623fd573a07f54dbfb525a46d4b4abcf132a634';

    server.listen(3000, function () {
      console.log('%s listening at %s', server.name, server.url);
      gateway = gatewayService(config);
      done();
    });


  });
  afterEach(function (done) {
    gateway && gateway.stop(()=> {
    });
    server.close();
    done();
  })



  it('fails if plugin dir not configured', function (done) {
    config.edgemicro.plugins = {};
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('plugin dir not configured');
      done(!err);
    });
  });

  it('fails if plugin dir is not a string', function (done) {
    config.edgemicro.plugins.dir = 42;
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('invalid plugin dir');
      done(!err);
    });
  });

  it('fails if plugin dir does not exist', function (done) {
    config.edgemicro.plugins.dir = path.sep + 'foo';
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('plugin dir does not exist: ' + path.sep + 'foo');
      done(!err);
    });
  });

  it('fails if plugin dir is not a dir', function (done) {
    config.edgemicro.plugins.dir = './package.json';
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('plugin dir is not a directory: package.json');
      done(!err);
    });
  });

  it('fails if plugin dir is not readable', function (done) {
    if (process.platform === 'win32') {
      return done();
    } // disabled on windows

    var tmpdir = path.join(os.tmpdir(), 'em-' + config.uid);
    fs.mkdirSync(tmpdir);
    fs.chmodSync(tmpdir, '0300'); // not readable by owner

    config.edgemicro.plugins.dir = tmpdir;
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.match(/^EACCES: permission denied/);
      fs.rmdirSync(tmpdir);
      done(!err);
    });
  });

  it('fails if plugin sequence not configured', function (done) {
    config.edgemicro.plugins.dir = '.';
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('plugin sequence not configured');
      done(!err);
    });
  });

  it('fails if plugin sequence is not an array', function (done) {
    config.edgemicro.plugins.sequence = 42;
    gateway.start( function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('invalid plugin sequence: 42');
      done(!err);
    });
  });

  it('fails if analytics is not the first in plugin sequence', function (done) {
    config.edgemicro.plugins.dir = '../plugins';
    config.edgemicro.plugins.sequence = ['foo', 'analytics'];
    gateway.start(function (err) {
      debug(err);
      expect(err).not.to.be.null;
      err.should.have.property('message').that.eqls('analytics must be the first sequenced plugin');
      done(!err);
    });
  });

  it('succeeds if analytics is not specified in plugin sequence', function (done) {
    config.edgemicro.plugins.dir = '../plugins';
    config.edgemicro.plugins.sequence = [];
    config.analytics = {
      uri: 'uri',
      key: 'key',
      proxy: 'proxy'
    };
    gateway.start( function (err, server) {
      debug(err);
      expect(err).to.be.null;
      gateway.stop(done);
    });
  });

});
