const assert = require('assert');
const matcherModule = require('../lib/proxy-path-matcher');
const matcher = matcherModule.matchPath;
const getProxyFromBasePath = matcherModule.getProxyFromBasePath;

const proxies = [
  {
    base_path:'/quux'
  },
  {
    base_path:'/baz/bar'
  },
  {
    base_path:'/foo/bar/*/quux'
  }
];

describe('Path matching functionality', () => {
  describe('Matching function', () => {
    it('will match wildcard paths', () => {
      assert.equal(matcher('/foo/bar', '/foo/*'), true);
    });

    it('will match non-wildcard paths', () => {
      assert.equal(matcher('/foo/bar', '/foo/bar'), true);
    });

    it('will match another wildcard path use case', () => {
       assert.equal(matcher('/foo/baz/bar', '/foo/*/bar'), true);
    });

    it('will match against a full path that doesnt have content in the pattern', () => {
       assert.equal(matcher('/foo/baz/bar/quux/foo', '/foo/*/bar'), true);
    });

    it('will not match against a full path that doesnt have content in the pattern', () => {
       assert.equal(matcher('/bloo/baz/bar/quux/foo', '/foo/*/bar'), false);
    });

    it('will match basepaths to full paths', () => {
      assert.equal(matcher('/foo/bar', '/foo'), true);
    });

    it('will not match bad basepaths to full paths', () => {
      assert.equal(matcher('/bloo/bar', '/foo'), false);
    });
  });

  describe('proxy selection using matching', () => {
    it('will properly select a proxy without wildcards in it the base_path', () => {
      const matchedProxy = getProxyFromBasePath(proxies, '/baz/bar/quux')
      assert.equal(matchedProxy.base_path, '/baz/bar');
    });

    it('will properly select another proxy without wildcards in it the base_path', () => {
      const matchedProxy = getProxyFromBasePath(proxies, '/quux')
      assert.equal(matchedProxy.base_path, '/quux');
    });

    it('will properly select a proxy with wildcards in it the base_path', () => {
      const matchedProxy = getProxyFromBasePath(proxies, '/foo/bar/baz/quux')
      assert.equal(matchedProxy.base_path, '/foo/bar/*/quux');
    });
  });
});
