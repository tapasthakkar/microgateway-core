const assert = require('assert');
const NoProxyParseAndMatch = require('../lib/no-proxy-parser');

describe('no proxy variable parsing and matching', () => {
  it('will parse and match a host in the list', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost/', 'localhost');
    assert.equal(matched, true);
  });

  it('will parse and not match a host in the list', ()=> {
    const matched = NoProxyParseAndMatch('http://foo.bar/', 'localhost');
    assert.equal(matched, false);
  });

  it('will parse and match a host with port in the list', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost:8080/', 'localhost:8080');
    assert.equal(matched, true);
  });

  it('will parse and not match a host with port in the list', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost:8081/', 'localhost:8080');
    assert.equal(matched, false);
  });

  it('will parse and match a host with default TLS port in the list', ()=> {
    const matched = NoProxyParseAndMatch('https://localhost/', 'localhost:443');
    assert.equal(matched, true);
  });

  it('will parse and match a host with default HTTP port in the list', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost/', 'localhost:80');
    assert.equal(matched, true);
  });

  it('will parse and match a host regardless of port information', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost:8080/', 'localhost');
    assert.equal(matched, true);
  });
});