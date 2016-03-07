'use strict'

var fs = require('fs')
var http = require('http')
var debug = require('debug')('gateway:logging')
var mkdir = require('mkdirp')
var os = require('os')
var _ = require('_')
var path = require('path')
var util = require('util')
var stats = require('./stats')
var configService = require('./config')
var assert = require('assert')

var winston = require('winston')
var winstonDaily = require('winston-daily-rotate-file')

var logger
module.exports.init = function init (stubConfig) {
  var config = stubConfig || configService.get()
  var logConfig = config.edgemicro.logging
  assert(logConfig, 'must have config.edgemicro.logging')
  var baseFileName = util.format('edgemicro-%s-%s.log', os.hostname(), config.uid)

  logger = new (winston.Logger)({
    level: logConfig.level,
    transports: [
      new (winston.transports.Console)(),
      new (winstonDaily)({
        filename: baseFileName,
      dirname: (logConfig.dir || path.dirname('.'))})
    ]
  })
}

module.exports.getLogger = () => {
  assert(logger, 'winston not initialized ')
  var loggerFacade = {
    info: function (obj, msg) {
      var rec = _serializeLogRecord(logger.level, obj, msg)
      logger.info(rec)
      return rec
    },
    warn: function (obj, msg) {
      var rec = _serializeLogRecord(logger.level, obj, msg)
      logger.warn(rec)
      return rec
    },
    error: function (obj, msg) {
      var rec = _serializeLogRecord(logger.level, obj, msg)
      logger.error(rec);
      return rec;
    },
    stats: function (statsInfo, msg) {
      var rec = _serializeLogRecord(logger.level, statsInfo, msg);
      logger.info(rec);
      return rec;
    },
    setLevel: function (level) {
      assert(level,'level not defined');
      logger.level = _.isString(level) ? level : level.edgemicro.logging.level;
    }
  }
  return loggerFacade
}

// choose certain properties of req/res/err to include in log records, pass the rest through
// be extra careful to not throw an error here
// - by inadvertently dereferencing any null/undefined objects
function _serializeLogRecord (level, obj, text) {
  var record = {}
  if (typeof obj === 'string') {
    if (text) text = text + ' ' + obj // append obj to text
    else text = obj // assign obj to text
  } else if (obj) Object.keys(obj).forEach(function (key) {
      if (key === 'req') {
        var req = obj[key]
        if (req) {
          record.m = req.method,
          record.u = req.url,
          record.h = req.headers ? req.headers.host : '',
          record.r = req.socket ? (req.socket.remoteAddress + ':' + req.socket.remotePort) : ':0'
        }
      } else if (key === 'res') {
        var res = obj[key]
        if (res) {
          record.s = res.statusCode
        }
      } else if (key === 'err') {
        var err = obj[key]
        if (err) {
          record.name = err.name,
          record.message = err.message,
          record.code = err.code,
          record.stack = err.stack
        }
      } else if (key === 'stats') {
        var stats = obj[key]
        if (stats) {
          Object.keys(stats).forEach(function (key) {
            if (key === 'statusCodes') {
              var codes = stats[key]
              record[key] = '{' + Object.keys(codes).map(function (code) {
                  return code + '=' + codes[code]
                }).join(', ') + '}'
            } else {
              record[key] = stats[key]
            }
          })
        }

        var mem = process.memoryUsage()
        record.rss = mem.rss

        var cpus = os.cpus()
        var userTimes = []
        cpus.forEach(function (cpu) {
          userTimes.push(cpu.times.user)
        })
        record.cpu = '[' + userTimes.join(', ') + ']'
      } else {
        record[key] = obj[key]
      }
    })

  return Date.now() + ' ' +
  level + ' ' +
  (text ? text + ' ' : '') +
  Object.keys(record).map(function (key) {
    return key + '=' + record[key]; // assumes vaules are primitive, no recursion
  }).join(', ') +
  os.EOL
}
