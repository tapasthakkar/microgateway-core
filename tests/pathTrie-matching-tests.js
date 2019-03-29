const assert = require("assert");
const { matchPath, buildTrie } = require("../lib/pathTrie.js");

const proxies = [
  {
    base_path: "/quux",
    url: "http://asdf.com/quux"
  },
  {
    base_path: "/baz/bar",
    url: "http://asdf.com/baz/bar"
  },
  {
    base_path: "/foo/bar/*/quux",
    url: "http://asdf.com/foo/bar/star/quux"
  }
  // ,
  // {
  //   // base_path:'/foo/bar/', url: 'http://asdf.com/foo/bar/'
  // },
  // {
  //   base_path:'/foo/bar/', url: 'http://asdf.com/foo/bar/'
  // },
];
let trie = {};
describe("Path matching functionality", () => {
  before(done => {
    //build trie
    trie = buildTrie(proxies);
    done();
  });

  describe("Matching function", () => {
    it("will match wildcard paths", () => {
      // assert.equal(matcher('/foo/bar', '/foo/*'), true);
      let newTrie = buildTrie([{ base_path: "/foo/*", url: "http://foo.com/foo/star" }]);
      assert.equal("http://foo.com/foo/star", matchPath("/foo/bar", newTrie));
    });

    it("will match non-wildcard paths", () => {
      // assert.equal(matcher('/foo/bar', '/foo/bar'), true);
      let newTrie = buildTrie([{ base_path: "/foo/bar", url: true }]);
      assert.equal(true, matchPath("/foo/bar", newTrie));
    });

    it("will match another wildcard path use case", () => {
      // assert.equal(matcher('/foo/baz/bar', '/foo/*/bar'), true);
      let newTrie = buildTrie([{ base_path: "/foo/*/bar", url: true }]);
      assert.equal(true, matchPath("/foo/baz/bar", newTrie));
    });

    it("will match against a full path that doesnt have content in the pattern", () => {
      // assert.equal(matcher('/foo/baz/bar/quux/foo', '/foo/*/bar'), true);
      let newTrie = buildTrie([{ base_path: "/foo/*/bar", url: true }]);
      assert.equal(true, matchPath("/foo/baz/bar/quux/foo", newTrie));
    });

    it("will not match against a full path that doesnt have content in the pattern", () => {
      // assert.equal(matcher('/bloo/baz/bar/quux/foo', '/foo/*/bar'), false);
      let newTrie = buildTrie([{ base_path: "/foo/*/bar", url: true }]);
      assert.equal(false, matchPath("/bloo/baz/bar/quux/foo", newTrie));
    });

    it("will match basepaths to full paths", () => {
      // assert.equal(matcher('/foo/bar', '/foo'), true);
      let newTrie = buildTrie([{ base_path: "/foo", url: true }]);
      assert.equal(true, matchPath("/foo/bar", newTrie));
    });

    it("will not match bad basepaths to full paths", () => {
      // assert.equal(matcher('/bloo/bar', '/foo'), false);
      let newTrie = buildTrie([{ base_path: "/foo", url: true }]);
      assert.equal(false, matchPath("/bloo/bar", newTrie));
    });
  });

  describe("proxy selection using matching", () => {
    it("will properly select a proxy without wildcards in it the base_path", () => {
      //     const matchedProxy = getProxyFromBasePath(proxies, '/baz/bar/quux')
      //     assert.equal(matchedProxy.base_path, '/baz/bar');
      let newTrie = buildTrie(proxies);
      assert.equal("http://asdf.com/baz/bar", matchPath("/baz/bar/quux", newTrie));
    });

    it("will properly select another proxy without wildcards in it the base_path", () => {
      // const matchedProxy = getProxyFromBasePath(proxies, '/quux')
      // assert.equal(matchedProxy.base_path, '/quux');
      let newTrie = buildTrie(proxies);
      assert.equal("http://asdf.com/quux", matchPath("/quux", newTrie));
    });

    it("will properly select a proxy with wildcards in it the base_path", () => {
      // const matchedProxy = getProxyFromBasePath(proxies, '/foo/bar/baz/quux')
      // assert.equal(matchedProxy.base_path, '/foo/bar/*/quux');
      let newTrie = buildTrie(proxies);
      assert.equal("http://asdf.com/foo/bar/star/quux", matchPath("/foo/bar/baz/quux", newTrie));
    });
  });
});
