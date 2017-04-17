const minimatch = require('minimatch');
const lru = require('lru-cache');
const util = require('util');
const cacheOpts = {
  max: 100,
  maxAge: 1000 * 60 * 10
}

const cache = lru(cacheOpts);

const matchPath = (requestPath, proxyPath) => {
  if(proxyPath.indexOf('*') > -1) {
    //We do this because it should not just be a hard match on the path. Could
    //also be path and extra afterwards
    const wildcardProxyPath = util.format('%s/**', proxyPath);
    const matchAgainstProxyPath = minimatch(requestPath, wildcardProxyPath);
    const matchAgainstJustProxyPath = minimatch(requestPath, proxyPath);
    return matchAgainstJustProxyPath || matchAgainstProxyPath;
  } else {
    return requestPath.indexOf(proxyPath) === 0;
  }
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

module.exports.matchPath = matchPath;
module.exports.getProxyFromBasePath = getProxyFromBasePath;
