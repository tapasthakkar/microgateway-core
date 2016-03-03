'use strict';

const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');
const debug = require('debug')('gateway:main');
const configService = require('./config');

/**
 * adds proxy to request
 * @param config
 * @returns {Function}
 */
module.exports = function () {

  const config = configService.get();

  if(config && config.proxies) {
    config.proxies.forEach(function (proxy) {
      proxy.parsedUrl = url.parse(proxy.url);
      const secure = proxy.parsedUrl.protocol === 'https:';
      proxy.basePathLength = proxy.base_path.length;
      proxy.secure = secure;
      proxy.agent = new (secure ? https : http).Agent({
        maxSockets: limit(proxy.max_connections), // limit target connections
        keepAlive: true
      });
    });
  }

  return (req, res, next) => {
    const reqUrl = url.parse(req.url, true);

    req.reqUrl = reqUrl;

    const proxy = getProxyfromBasePath(config.proxies, reqUrl.pathname);

    if (!proxy) {
      res.statusCode = 404; // No matching path found
      debug('dropped', res.statusCode, req.method, req.url, req.headers, 'no match found for ' + reqUrl.pathname);
      const nomatch = Error('no match found for ' + reqUrl.pathname);
      nomatch.status = res.statusCode;
      return next(nomatch);
    }

    res.proxy = proxy; // set for other middleware to pick up

    debug('selected proxy %s with base path %s for request path %s', proxy.url, proxy.base_path, reqUrl.pathname);

    next();
  };

};

// find the most specific proxy whose base_path is the base_path of request
// this is done brute-force at this time
const getProxyfromBasePath = function (proxies, pathname) {
  var longest = 0;
  var match = undefined;
  proxies.forEach(function(proxy) {
    if (pathname.indexOf(proxy.base_path) === 0) {
      if (proxy.base_path.length > longest) {
        match = proxy;
        longest = proxy.base_path.length;
      }
    }
  });
  return match;
}

function limit(value) {
  // use value if configured, numeric and positive, otherwise unlimited
  return value && typeof value === 'number' && value > 0 ? value : Infinity;
}