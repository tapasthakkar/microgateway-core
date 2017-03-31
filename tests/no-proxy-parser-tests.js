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
  
  it('will parse and match a host when no proxy is comma delimited list', ()=> {
    const matched = NoProxyParseAndMatch('http://localhost/', 'localhost,foo.bar,bar.baz');
    assert.equal(matched, true);
  });

  it('will parse and match a host that is second in list when no proxy is comma delimited list', ()=> {
    const matched = NoProxyParseAndMatch('http://foo.bar/', 'localhost,foo.bar,bar.baz');
    assert.equal(matched, true);
  });

  it('will parse and match a host that is last in list when no proxy is comma delimited list', ()=> {
    const matched = NoProxyParseAndMatch('http://bar.baz/', 'localhost,foo.bar,bar.baz');
    assert.equal(matched, true);
  });


  it('will parse and match a host with port that is second in list when no proxy is comma delimited list', ()=> {
    const matched = NoProxyParseAndMatch('http://foo.bar:8080/', 'localhost,foo.bar:8080,bar.baz');
    assert.equal(matched, true);
  });

  it('will parse and match a host with port that is last in list when no proxy is comma delimited list', ()=> {
    const matched = NoProxyParseAndMatch('http://bar.baz:8080/', 'localhost,foo.bar,bar.baz:8080');
    assert.equal(matched, true);
  });

  it('will not partially match hosts', () => {
    const matched = NoProxyParseAndMatch('http://ar.baz:8080/', 'localhost,foo.bar,bar.baz:8080');
    assert.equal(matched, false);
  });

  it('will not partially match hosts with only one in no_proxy list', () => {
    const matched = NoProxyParseAndMatch('http://foo/', 'foo.bar');
    assert.equal(matched, false);
  });
});