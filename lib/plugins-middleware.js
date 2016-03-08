'use strict';

var http = require('http');
var https = require('https');
var path = require('path');
var url = require('url');
var uuid = require('uuid');
var _ = require('lodash');
var async = require('async');
var debug = require('debug')('gateway:main');
var configService = require('./config');
var logging = require('./logging')
var double_slash_regex = /\/\/+/g;
var empty_buffer = new Buffer(0);
var assert = require('assert');
var stats = require('./stats')


/**
 * injects plugins into gateway
 * @param plugins
 * @returns {Function(req,res,cb)}
 */
module.exports = function (plugins) {
  const logger = logging.getLogger();

  return function (sourceRequest, sourceResponse, next) {
    var sourceRequestPromises = [];

    var correlation_id = uuid.v1();
    logger.info({req: sourceRequest, i: correlation_id}, 'sourceRequest');
    debug('sourceRequest', correlation_id, sourceRequest.method, sourceRequest.url);
    var requestPromise = null;
    //process the requests
    async.series(
      //onrequest
      _executePluginHandlers(null, {
        plugins: plugins,
        sourceRequest: sourceRequest,
        sourceResponse: sourceResponse
      }),
      function (err) {
        if (_.isBoolean(err) && err) {
          return next(false);
        }
        if (err) {
          return next(err)
        }
        //get the response
        var targetRequest = _sendTargetRequest(sourceRequest, sourceResponse, correlation_id,
          (targetResponse) => {
            var options = {
              start: Date.now,
              correlation_id: correlation_id,
              plugins: plugins,
              sourceRequest: sourceRequest,
              sourceResponse: sourceResponse,
              promises: sourceRequestPromises,
              requestPromise: requestPromise
            };

            _handleTargetResponse(targetRequest, targetResponse, options, function (err, results) {
              if (err) {
                next(err);
              }
              sourceResponse.end(results);
              next();
            })
          });


        requestPromise = _subscribeToRequestEvents(plugins, sourceRequestPromises, sourceRequest, sourceResponse, targetRequest);
      });

  }
};

/**
 * call the target server to send the source request
 * @param plugins
 * @param correlation_id
 * @param sourceRequest
 * @param sourceResponse
 * @param cb
 * @private
 */
function _sendTargetRequest(sourceRequest, sourceResponse, correlation_id, cb) {

  const logger = logging.getLogger();
  const config = configService.get();

  const reqUrl = sourceRequest.reqUrl;
  const proxy = sourceResponse.proxy;

  // try to pass through most of the original request headers unmodified
  const target_headers = _.clone(sourceRequest.headers);

  if (_configured(config, 'x-request-id')) {
    // https://devcenter.heroku.com/articles/http-request-id
    target_headers['x-request-id'] =
      config.uid + '.' + correlation_id.toString();
  }

  if (_configured(config, 'x-forwarded-for')) {
    // append client address to the x-forwarded-for header
    var forwarded_for = target_headers['x-forwarded-for'];
    forwarded_for += forwarded_for ? ', ' : '';

    forwarded_for += sourceRequest.socket.remoteAddress;
    target_headers['x-forwarded-for'] = forwarded_for;
  }

  var hostname = target_headers.host;
  if (hostname) { // might be missing (with an http-1.0 client for example)

    if (_configured(config, 'x-forwarded-host')) {
      // append host heeader to the x-forwarded-host header
      var forwarded_host = target_headers['x-forwarded-host'];
      forwarded_host += forwarded_host ? ', ' : '';
      forwarded_host += hostname;
      target_headers['x-forwarded-host'] = forwarded_host;
    }

    var colon = hostname.indexOf(':');
    if (colon > 0) {
      hostname = hostname.substring(0, colon); // strip port if present
    }

    if (_configured(config, 'via')) {
      // append our hostname (but not the port), if present, to the via header
      var via = target_headers['via'];
      via += via ? ', ' : '';
      via += sourceRequest.httpVersion + ' ' + hostname;
      target_headers['via'] = via;
    }

    // delete the original host header to let node fill it in for the target request
    delete target_headers.host;
    // delete the original content-length to let node fill it in for the target request
    if (target_headers['content-length']) {
      delete target_headers['content-length'];
    }
  }

  var target_path =
    proxy.parsedUrl.pathname + reqUrl.pathname.substr(proxy.basePathLength, reqUrl.pathname.length); // strip leading base_path
  if (reqUrl.search) target_path += reqUrl.search;
  target_path = target_path.replace(double_slash_regex, '/');

  const targetRequestOptions = {
    hostname: proxy.parsedUrl.hostname,
    port: proxy.parsedUrl.port,
    path: target_path,
    method: sourceRequest.method,
    headers: target_headers, // pass through the modified headers
    agent: proxy.agent
  };

  const httpLibrary = proxy.secure ? https : http;
  assert(httpLibrary.request, 'must have request method');
  var targetRequest = httpLibrary.request(targetRequestOptions,
    (targetResponse) => {

      cb(targetResponse);

    });

  const logInfo = {
    m: targetRequestOptions.method,
    u: targetRequestOptions.path,
    h: targetRequestOptions.hostname + ':' + targetRequestOptions.port,
    i: correlation_id
  };
  // log target request options, minus agent
  logger.info(logInfo, 'targetRequest');

  debug('targetRequest', correlation_id, targetRequestOptions.method, targetRequestOptions.hostname, targetRequestOptions.port, targetRequestOptions.path);
  stats.incrementRequestCount();

  return targetRequest;

};

/**
 *
 * @param targetRequest
 * @param targetResponse
 * @param options {start, correlation_id, plugins, sourceRequest, sourceResponse,promises}
 * @param cb
 * @private
 */
function _handleTargetResponse(targetRequest, targetResponse, options, cb) {
  const start = options.start;
  const correlation_id = options.correlation_id;
  const plugins = options.plugins;
  const sourceRequest = options.sourceRequest;
  const sourceResponse = options.sourceResponse;
  const logger = logging.getLogger();
  const config = configService.get();
  const promises = options.promises;
  const requestPromise = options.requestPromise;

  logger.info({res: targetResponse, d: Date.now() - start, i: correlation_id}, 'targetResponse');
  debug('targetResponse', correlation_id, targetResponse.statusCode);
  const onResponsePromise = new Promise(function (resolve, reject) {
    async.series(
      //onresponse
      _executePluginHandlers(null, {
        plugins: plugins,
        sourceRequest: sourceRequest,
        sourceResponse: sourceResponse,
        targetRequest: targetRequest,
        targetResponse: targetResponse
      }),
      function (err, results) {
        err && logger.error(err);
        if (sourceResponse.finished || sourceResponse.headersSent) {
          logger.error("response finished before work can be done");
          reject("response finished before work can be done");
          return;
        }

        if (err) {
          reject("error encountered");
          return cb(err);
        }

        debug(results);
        stats.incrementStatusCount(targetResponse.statusCode);
        stats.incrementResponseCount();
        // the size of the body will change if any of the plugins transform the content
        // delete the response content-length and let node recalculate it for the client request
        delete targetResponse.headers['content-length'];
        // propagate response headers from target to client
        Object.keys(targetResponse.headers).forEach(function (header) {
          // skip setting the 'connection: keep-alive' header
          // setting it causes gateway to not accept any more connections
          if (header !== 'connection') {
            sourceResponse.setHeader(header, targetResponse.headers[header]);
          }
        });
        sourceResponse.statusCode = targetResponse.statusCode;

        if (_configured(config, 'x-response-time')) {
          sourceResponse.setHeader('x-response-time', Date.now() - start);
        }
        resolve();

      });
  });
  promises.push(onResponsePromise);
  _subscribeToResponseEvents(plugins, promises, onResponsePromise, requestPromise, sourceRequest, sourceResponse, targetRequest, targetResponse, correlation_id, start,
    function (err, result) {
      cb(err, result)
    });

};

function _subscribeToRequestEvents(plugins, promises, sourceRequest, sourceResponse, targetRequest) {
  const logger = logging.getLogger();
  var sourceRequestOnDataPromise = null;
  // write body
  sourceRequest.on('data', function (data) {
    const promise = sourceRequestOnDataPromise = new Promise((resolve, reject)=> {
      debug('req data', data ? data.length : 'null');
      async.seq.apply(this,
        _executePluginHandlers('data', {
          plugins: plugins,
          sourceRequest: sourceRequest,
          sourceResponse: sourceResponse
        }))(data,
        function (err, result) {
          if (err) {
            logger.error(err);
            return reject(err);
          }
          result && targetRequest.write(result); // write transformed data to target
          resolve();
        });
    });
    promises.push(promise);

  });

  sourceRequest.on('end', function () {
    const promise = new Promise((resolve, reject) => {
      var go = () => {
        debug('req end');

        async.seq.apply(this, _executePluginHandlers('end', {
          plugins: plugins,
          sourceRequest: sourceRequest,
          sourceResponse: sourceResponse
        }))(empty_buffer,
          function (err, result) {
            if (err) {
              logger.error(err);
              return reject(err);
            }
            targetRequest.end(result); // write transformed data to target
            resolve();
          });
      }
      if (sourceRequestOnDataPromise) {
        sourceRequestOnDataPromise.then(go);
      } else {
        go();
      }

    });
    promises.push(promise);

  });


  sourceRequest.on('error', function (err) {
    const logInfo = {
      m: targetRequestOptions.method,
      u: targetRequestOptions.path,
      h: targetRequestOptions.hostname + ':' + targetRequestOptions.port,
      i: correlation_id
    };
    logger.warn({req: logInfo, d: Date.now() - start, i: correlation_id, err: err}, 'treq error');
    debug('treq error', correlation_id, err.stack);
    async.series(_executePluginHandlers('error', {
        plugins: plugins,
        sourceRequest: sourceRequest,
        sourceResponse: sourceResponse
      }),
      function (e) {
        if (e) {
          logger.error(e);
          cb(e);
        } else {
          sourceResponse.statusCode = 502; // Bad Gateway
          cb(err);
        }
      });
  });

  sourceRequest.on('close', function () {
    const promise = new Promise(function (resolve, reject) {

      var go = () => {
        debug('sourceRequest close');
        async.series(_executePluginHandlers('close', {
            plugins: plugins,
            sourceRequest: sourceRequest,
            sourceResponse: sourceResponse
          }),
          function (e, results) {
            sourceRequest.destroy();
            sourceResponse.destroy();
            resolve();
          });
      };
      if (sourceRequestOnDataPromise) {
        sourceRequestOnDataPromise.then(go);
      } else {
        go();
      }
    });
    promises.push(promise);

  });
  return sourceRequestOnDataPromise;
};

function _subscribeToResponseEvents(plugins, promises, onResponsePromise, requestPromise, sourceRequest, sourceResponse, targetRequest, targetResponse, correlation_id, start, cb) {
  const logger = logging.getLogger();
  var resolved = false;
  var onDataPromise;
  targetResponse.on('data', function (data) {

    const promise = new Promise(function (resolve, reject) {
      const go = () => {
        if (data && !sourceResponse.finished) {
          async.seq.apply(this, _executePluginHandlers('data', {
            plugins: plugins,
            sourceRequest: sourceRequest,
            sourceResponse: sourceResponse,
            targetRequest: targetRequest,
            targetResponse: targetResponse
          }))(data,
            function (err, result) {
              err && logger.error(err);
              if (err) {
                return reject(err);
              }
              if (result) {
                var go = () => {
                  sourceResponse.write(result);
                }
                if (requestPromise) {
                  requestPromise.then(go);
                } else {
                  go();
                }
                !resolved && resolve();
              } // write transformed data to response
              else {
                !resolved && resolve();
              }
            });
        } else {
          if (data) {
            logger.warn({res: targetResponse, i: correlation_id}, 'discarding data received after response sent');
          }
          resolve();
        }
      };
      onResponsePromise ?  onResponsePromise.then( go) : go();

    });
    onDataPromise = promise;
    promises.push(promise)
  });


  targetResponse.on('end', function () {
    const go = ()=> {
      logger.info({res: sourceResponse, d: Date.now() - start, i: correlation_id}, 'res');
      debug('targetResponse end', correlation_id, targetResponse.statusCode);
      async.seq.apply(this, _executePluginHandlers('end', {
        plugins: plugins,
        sourceRequest: sourceRequest,
        sourceResponse: sourceResponse,
        targetRequest: targetRequest,
        targetResponse: targetResponse
      }))(
        empty_buffer,
        function (err, result) {
          err && logger.error(err);
          Promise.all(promises)
            .then(
              ()=> { //resolve
                cb(err, result);
              },
              (reason) => { //reject
                reason && logger.error(reason);
                cb(err, result);
              })
            .catch((err)=> {
              logger.error(err, 'all promises were rejected')
              cb(err);
            })
        });
    };

    onDataPromise ? onDataPromise.then(go) : go();


  });

  targetResponse.on('close', function () {
    const promise = new Promise(function (resolve, reject) {
      debug('targetResponse close', correlation_id);
      logger.info({res: sourceResponse, d: Date.now() - start, i: correlation_id}, 'res close');
      async.series(_executePluginHandlers('close', {
          plugins: plugins,
          sourceRequest: sourceRequest,
          sourceResponse: sourceResponse,
          targetRequest: targetRequest,
          targetResponse: targetResponse
        }),
        function (err, results) {
          if (err) {
            logger.error(err);
            reject(err);
          }
          // close the client connection when our connection to the target is closed (ETIMEOUT etc)
          sourceResponse.destroy();
          sourceRequest.destroy();
          resolve();
        });
    });
    promises.push(promise);
  });

  targetResponse.on('error', function (err) {
    logger.warn({
      res: targetResponse,
      d: Date.now() - start,
      i: correlation_id,
      err: err
    }, 'targetResponse error');
    const promise = new Promise(function (resolve, reject) {

      debug('targetResponse error', correlation_id, err.stack);
      async.series(_executePluginHandlers('error', {
          plugins: plugins,
          sourceRequest: sourceRequest,
          sourceResponse: sourceResponse,
          targetRequest: targetRequest,
          targetResponse: targetResponse
        }),
        function (e) {
          if (e) {
            cb(e)
            reject(e);
          } else {
            cb(err);
            reject(err);
          }

        });
    });
    promises.push(promise);

  });
}

const _executePluginHandlers = function (type, options) {
  const plugins = options.plugins;
  const pluginMap = plugins.map((plugin)=>_executePluginHandler(plugin, type, options));
  return pluginMap;
};

function _executePluginHandler(plugin, type, options) {
  const isRequest = !options.targetRequest;
  const logger = logging.getLogger();
  //return handler
  return (data, cb) => {
    cb = _.isFunction(data) ? data : cb;
    data = _.isFunction(data) ? null : data;
    const pluginOptions = {
      targetResponse: options.targetResponse,
      targetRequest: options.targetRequest,
      sourceRequest: options.sourceRequest,
      sourceResponse: options.sourceResponse,
      data: data
    };

    try {

      const handler = (type ? type + '_' : '') + (isRequest ? 'request' : 'response');
      if (plugin['on' + handler] && _.isFunction(plugin['on' + handler])) {
        var fx =  function (e, newData) {
          cb(e, newData || data);
        };
        plugin['on' + handler](options.sourceRequest, options.sourceResponse, 
          plugin['on' + handler].length === 3 ? fx : pluginOptions, //if 3 args must be the older style
          fx)
      } else {
        logger.warn("plugin " + plugin.id + " does not provide handler function for " + handler);
        cb(null, data); // plugin does not provide onerror_request, carry on
      }
    }catch (handlerException){
      logger.error(handlerException,plugin.id+" handler threw an exception")
      cb(handlerException)
    }

  }
};


const _configured = function (config, property) {
  if (config.headers) {
    var value = config.headers[property];
    return value ? value : _.isUndefined(value); // on if unspecified
  } else {
    return true; // on if no config.headers section
  }
};



