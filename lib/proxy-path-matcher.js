const minimatch = require('minimatch');
const lru = require('lru-cache');
const util = require('util');
const cacheOpts = {
  max: 100,
  maxAge: 1000 * 60 * 10
}

const cache = lru(cacheOpts);

const matchPath = (requestPath, proxyPath) => {
  var pathRegex = generateMatchingRegex(proxyPath);
  return pathRegex.test(requestPath);
}

const getProxyFromBasePath = (proxies, pathname) => {
  var longest = 0;
  var match = undefined;

  const cachedProxy = cache.get(pathname);
  if(cachedProxy) {
    return cachedProxy;
  }


  proxies.forEach((p) => {
    if(matchPath(pathname, p.base_path)) {
      if(p.base_path.length > longest) {
        match = p;
        longest = p.base_path.length; 
      }
    }
  });

  cache.set(pathname, match);
  return match;
}

const generateMatchingRegex = (proxyPath) => {
  const matchRegex = minimatch.makeRe(proxyPath);
  //minimatch creates a regex that will hard match the path. 
  //we remove the end of input so it can match proxy path and extras
  const cleansedRegex = matchRegex.toString().replace('$', '').slice(1, -1);
  return new RegExp(cleansedRegex);
}

module.exports.matchPath = matchPath;
module.exports.generateMatchingRegex = generateMatchingRegex;
module.exports.getProxyFromBasePath = getProxyFromBasePath;
