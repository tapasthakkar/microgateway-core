const url = require('url')

function canonicalizeHostname(h) {
    return h.replace(/^\.*/, '.').toLowerCase();
}

function parseNoProxy(noProxyVar) {
  var hosts = noProxyVar.split(',');

  var formattedHosts = hosts.map((h) => {
    var hostParts = h.split(':');
    return {
      host: canonicalizeHostname(hostParts[0]),
      port: hostParts[1]
    }
  });
  return formattedHosts; 
}

function matchHostAgainstNoProxy(host, noProxyVar) {
  var parsedHosts = parseNoProxy(noProxyVar);
  var parsedHostToMatch = url.parse(host);
  var canonicalHost = canonicalizeHostname(parsedHostToMatch.hostname);

  if(!parsedHostToMatch.port) {
    parsedHostToMatch.port = parsedHostToMatch.protocol == 'https:' ? '443' : '80';
  }

  return parsedHosts.some((e) => {
    var matchIndex = e.host.indexOf(canonicalHost);
    const match = matchIndex > -1

    var perfectHostMatch = match && (matchIndex == e.host.length - canonicalHost.length);

    if(e.port) {
      return parsedHostToMatch.port == e.port && perfectHostMatch; 
    } else {
      return perfectHostMatch;
    }
  });
}

module.exports = matchHostAgainstNoProxy;



