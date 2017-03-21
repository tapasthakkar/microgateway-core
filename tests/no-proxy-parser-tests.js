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

  it('will return false if the no_proxy variable is undefined.', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost:8080/', undefined);
    assert.equal(matched, false);
  });

  it('will return false if the no_proxy variable is null.', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost:8080/', null);
    assert.equal(matched, false);
  });

  it('will return false if the no_proxy variable is an empty string.', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost:8080/', '');
    assert.equal(matched, false);
  });

  it('will return false if the host variable is undefined.', ()=> {
    const matched = NoProxyParseAndMatch(undefined, 'localhost');
    assert.equal(matched, false);
  });

  it('will return false if the host variable is null.', ()=> {
    const matched = NoProxyParseAndMatch(null, 'localhost');
    assert.equal(matched, false);
  });

  it('will return false if the host variable is an empty string.', ()=> {
    const matched = NoProxyParseAndMatch('', 'localhost');
    assert.equal(matched, false);
  });
});