const url = require('url');
const qs = require('querystring');

/*
 * Build options for a proxied request. This means:
 * Change request options to point at the proxy server
 * Change path of the request the full URL of where the request should be routed.
 */ 

module.exports = function(proxy, requestOpts, proxyOpts) {
  
  const parsedQuery = url.parse(requestOpts.path);
  const parsedHttpProxyUrl = url.parse(proxyOpts);

  var newOpts = {
    method: requestOpts.method,
    host: parsedHttpProxyUrl.hostname,
    port: parsedHttpProxyUrl.port,
    path: proxy.parsedUrl.href,
    headers: requestOpts.headers,
    agent: requestOpts.agent
  }

  return newOpts;
}
