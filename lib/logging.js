'use strict';

var fs = require('fs');
var http = require('http');
var debug = require('debug')('gateway:logging');
var mkdir = require('mkdirp');
var os = require('os');
var path = require('path');
var util = require('util');
var stats = require('./stats')
var configService = require('./config');
var assert = require('assert')

var logger;
module.exports.init = function init(stubConfig) {
  var config =stubConfig || configService.get();
  var logConfig = config.edgemicro.logging;
  assert(logConfig,'must have config.edgemicro.logging')
  var rotation = 0;
  var baseFileName = util.format('edgemicro-%s-%s', os.hostname(), config.uid);
  var writeLogRecord = function(record) {};

  if (!logConfig) {
    if (debug.enabled) {
      writeLogRecord = function(record) {
        console.info(record);
      }
    } else {
      var testLogFilePath = path.join(process.cwd(), baseFileName + '-test.log');
      var testLogFile = fs.createWriteStream(testLogFilePath, { flags: 'w', mode: 0o0600, encoding: 'utf-8' });
      writeLogRecord = function(record) {
        testLogFile.write(record, function(err) {
          if (err) {
            console.warn('error writing test log', err);
          }
        });
      }
    }
  } else {
    var logDir = logConfig.dir || process.cwd();
    mkdir.sync(logDir);

    // current stats are saved (best effort) to this file just before exiting
    var coreFilePath = path.join(logDir, baseFileName + '-core.log');

    // periodically log stats, but not if idle (no new requests or responses)
    var statsLogInterval = logConfig.stats_log_interval;
    if (typeof statsLogInterval === 'number' && statsLogInterval > 0) {
      var lastRequests = 0;
      var lastResponses = 0;
      var logTimer = setInterval(function() {
        var statsInfo = stats.getStats();
        if (lastRequests !== statsInfo.requests && lastResponses !== statsInfo.responses) {
          lastRequests = statsInfo.requests;
          lastResponses = statsInfo.responses;
          logger.stats(statsInfo);
        }
      }, statsLogInterval * 1000); // convert seconds to milliseconds
      logTimer.unref(); // don't keep event loop alive just for logging stats
    }

    var logFilePath;
    // using a WriteStream here causes excessive memory growth under high load (with node v0.12.6, jul 2015)
    var logFileFd;
    var logFailWarn = false;
    var writeInProgress = false;
    var records = [];
    var offset = 0;
    var nextRotation = 0;

    // buffer the write if a write is already in progress
    // https://nodejs.org/api/fs.html#fs_fs_write_fd_data_position_encoding_callback
    // "Note that it is unsafe to use fs.write multiple times on the same file without waiting for the callback."
    writeLogRecord = function(record) {
      if (Date.now() > nextRotation) {
        rotation++;
        baseFileName = util.format('edgemicro-%s-%s-%d', os.hostname(), config.uid, rotation);
        logFilePath = path.join(logDir, baseFileName + '-api.log');
        if (logFileFd) fs.close(logFileFd);
        logFileFd = fs.openSync(logFilePath, 'a', 0o0600);
        nextRotation = Date.now() + ((logConfig.rotate_interval || 24) * 60 * 60 * 1000); // hours -> ms
      }

      if (record) {
        records.push(record);
      }

      if (writeInProgress || records.length === 0) {
        return;
      }

      writeInProgress = true;
      var buffer = records.join('');
      records = [];

      fs.write(logFileFd, buffer, offset, 'utf8', function(err, written) {
        writeInProgress = false;

        if (err) {
          if (!logFailWarn) {
            // print warning once, dumping every failure to console would overwhelm the console
            console.warn('error writing log', err);
            logFailWarn = true;
          }
        } else {
          offset += written;
        }

        if (records.length > 0) {
          process.nextTick(function() {
            writeLogRecord();
          });
        }
      });
    }
  }

  var serializeInfo = _serializeLogRecord.bind(this, 'info');
  var serializeWarn = _serializeLogRecord.bind(this, 'warn');
  var serializeError = _serializeLogRecord.bind(this, 'error');
  var serializeStats = _serializeLogRecord.bind(this, 'stats');

  logger = {
    info: function(obj, msg) { return writeLogRecord(serializeInfo(logConfig.level, obj, msg)); },
    warn: function(obj, msg) { return writeLogRecord(serializeWarn(logConfig.level, obj, msg)); },
    error: function(obj, msg) { return writeLogRecord(serializeError(logConfig.level, obj, msg)); },
    stats: function(statsInfo, msg) { return writeLogRecord(serializeStats(logConfig.level, {stats: statsInfo}, msg)); },
    core: function(msg) {
      var statsInfo = stats.getStats();
      var statsRecord = _serializeLogRecord('stats', {stats: statsInfo}, msg);
      if (coreFilePath) {
        fs.writeFileSync(coreFilePath, statsRecord, {encoding: 'utf8', mode: 0o0600, flag: 'w'});
      } else {
        console.error(statsRecord);
      }
    },
    close: function() {
      if (logFileFd > 0) fs.closeSync(logFileFd);
    }
  };

  if (process.env.NODE_ENV === 'test') { // for testing
    writeLogRecord = function(record) { return record };
  }
};

module.exports.getLogger = ()=> {
  return logger;
}

// choose certain properties of req/res/err to include in log records, pass the rest through
// be extra careful to not throw an error here
// - by inadvertently dereferencing any null/undefined objects
function _serializeLogRecord(level, configLevel, obj, text) {

  switch (level) {
    case 'info':
    if (configLevel === 'warn' || configLevel === 'error') return null;
    case 'warn':
    if (configLevel === 'error') return null;
  }

  var record = {};
  if (typeof obj === 'string') {
    if (text) text = text + ' ' + obj; // append obj to text
    else text = obj; // assign obj to text
  } else if (obj) Object.keys(obj).forEach(function(key) {
    if (key === 'req') {
      var req = obj[key];
      if (req) {
        record.m = req.method,
        record.u = req.url,
        record.h = req.headers ? req.headers.host : '',
        record.r = req.socket ? (req.socket.remoteAddress + ':' + req.socket.remotePort) : ':0'
      }
    } else if (key === 'res') {
      var res = obj[key];
      if (res) {
        record.s = res.statusCode
      }
    } else if (key === 'err') {
      var err = obj[key];
      if (err) {
        record.name = err.name,
        record.message = err.message,
        record.code = err.code,
        record.stack = err.stack
      }
    } else if (key === 'stats') {
      var stats = obj[key];
      if (stats) {
        Object.keys(stats).forEach(function(key) {
          if (key === 'statusCodes') {
            var codes = stats[key];
            record[key] = '{' + Object.keys(codes).map(function(code) {
              return code + '=' + codes[code];
            }).join(', ') + '}'
          } else {
            record[key] = stats[key];
          }
        });
      }

      var mem = process.memoryUsage();
      record.rss = mem.rss;

      var cpus = os.cpus();
      var userTimes = [];
      cpus.forEach(function(cpu) {
        userTimes.push(cpu.times.user);
      });
      record.cpu = '[' + userTimes.join(', ') + ']';
    } else {
      record[key] = obj[key];
    }
  });

  return Date.now() + ' ' +
    level + ' ' +
    (text ? text + ' ' : '') +
    Object.keys(record).map(function(key) {
      return key + '=' + record[key]; // assumes vaules are primitive, no recursion
    }).join(', ') +
    os.EOL;
}
