'use strict';

const path = require('path');
const url = require('url');
const debug = require('debug')('gateway:main');
const configService = require('./config');
const double_slash_regex = /\/\/+/g;
const http = require('http');
const https = require('https');


/**
 * adds proxy to request
 * @param config
 * @returns {Function}
 */
module.exports = function () {

  const config = configService.get();

  console.log(config.proxies);

  if(config && config.proxies) {
    config.proxies.forEach(function (proxy) {
      proxy.parsedUrl = url.parse(proxy.url);
      const secure = proxy.parsedUrl.protocol === 'https:';
      proxy.basePathLength = proxy.base_path.length;
      proxy.secure = secure;
      const agentLib = secure ? https : http;
      const opts = {
        maxSockets: limit(proxy.max_connections),
        keepAlive: true
      }
      proxy.agent = new agentLib.Agent(opts);
    });
  }

  return (req, res, next) => {
    const reqUrl = url.parse(req.url, true);

    req.reqUrl = reqUrl;

    req._overrideHeaders = {};
    req._headersToUnset = [];

    req.setOverrideHeader = function(k, v) {
      req._overrideHeaders[k] = v; 
    };

    req.unsetHeader = function(k) {
      req._headersToUnset.push(k); 
    };

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

    var target_path =
        proxy.parsedUrl.pathname + reqUrl.pathname.substr(proxy.basePathLength, reqUrl.pathname.length); // strip leading base_path
    target_path = target_path.replace(double_slash_regex, '/'); // remove any unintended double slashes
    target_path += reqUrl.search || ''; // append the search string if necessary

    req.targetPath = target_path;
    req.targetHostname = proxy.parsedUrl.hostname;

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

const limit = (value) => {
  return value && typeof === 'number' && value > 0 ? value : Infinity;
}
