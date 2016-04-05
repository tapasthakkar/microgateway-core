'use strict'

const fs = require('fs')
const http = require('http')
const debug = require('debug')('gateway:logging')
const os = require('os')
const _ = require('lodash')
const path = require('path')
const util = require('util')
const stats = require('./stats')
const configService = require('./config')
const assert = require('assert')

const winston = require('winston')
const winstonDaily = require('winston-daily-rotate-file')
var logger, loggerFacade;

module.exports.init = function init(stubConfig) {
  const config = stubConfig || configService.get()
  const logConfig = config.edgemicro.logging
  assert(logConfig, 'must have config.edgemicro.logging')
  const baseFileName = util.format('edgemicro-%s.log', os.hostname())
  // new (winston.transports.Console)(),
  const transports = [];
  if (logConfig.level !== 'none') {
    transports.push(
      new (winstonDaily)({
        filename: baseFileName,
        dirname: (logConfig.dir || path.dirname('.'))
      })
    );
    logger = new (winston.Logger)({
      level: logConfig.level,
      transports: transports
    })
  }else{
    logger = {
      info:()=>{},
      error:()=>{},
      warn:()=>{},
      setLevel:()=>{},
      levels : {info:0,warn:1,error:3},
      isStub:true
    }
  }


  loggerFacade = {
    info: function(obj, msg) {
      if(logger.isStub){
        return;
      }
      const rec = _serializeLogRecord('info', obj, msg)
      logger.info(rec)
      return rec
    },
    warn: function(obj, msg) {
      if(logger.isStub){
        return;
      }
      const rec = _serializeLogRecord('warn', obj, msg)
      logger.warn(rec)
      return rec
    },
    error: function(obj, msg) {
      if(logger.isStub){
        return;
      }
      const rec = _serializeLogRecord('error', obj, msg)
      logger.error(rec);
      return rec;
    },
    stats: function(statsInfo, msg) {
      if(logger.isStub){
        return;
      }
      const rec = _serializeLogRecord('stats', statsInfo, msg);
      logger.info(rec);
      return rec;
    },
    setLevel: function(level) {
      assert(level, 'level not defined');
      logger.level = _.isString(level) ? level : level.edgemicro.logging.level;
    }
  };
}

module.exports.getLogger = () => {
  assert(logger, 'winston not initialized')
  return loggerFacade;
}

// choose certain properties of req/res/err to include in log records, pass the rest through
// be extra careful to not throw an error here
// - by inadvertently dereferencing any null/undefined objects
function _serializeLogRecord(level, obj, text) {
  if (logger.levels[logger.level] < logger.levels[level]) {
    return null;
  }

  const record = {}
  if (typeof obj === 'string') {
    if (text) text = text + ' ' + obj // append obj to text
    else text = obj // assign obj to text
  } else if (obj) Object.keys(obj).forEach(function(key) {
    if (key === 'req') {
      const req = obj[key]
      if (req) {
        record.m = req.method,
          record.u = req.url,
          record.h = req.headers ? req.headers.host : '',
          record.r = req.socket ? (req.socket.remoteAddress + ':' + req.socket.remotePort) : ':0'
      }
    } else if (key === 'res') {
      const res = obj[key]
      if (res) {
        record.s = res.statusCode
      }
    } else if (key === 'err') {
      const err = obj[key]
      if (err) {
        record.name = err.name,
          record.message = err.message,
          record.code = err.code,
          record.stack = err.stack
      }
    } else if (key === 'stats') {
      const stats = obj[key]
      if (stats) {
        Object.keys(stats).forEach(function(key) {
          if (key === 'statusCodes') {
            const codes = stats[key]
            record[key] = '{' + Object.keys(codes).map(function(code) {
              return code + '=' + codes[code]
            }).join(', ') + '}'
          } else {
            record[key] = stats[key]
          }
        })
      }

      const mem = process.memoryUsage()
      record.rss = mem.rss

      const cpus = os.cpus()
      const userTimes = []
      cpus.forEach(function(cpu) {
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
    Object.keys(record).map(function(key) {
      return key + '=' + record[key]; // assumes vaules are primitive, no recursion
    }).join(', ') +
    os.EOL
}
