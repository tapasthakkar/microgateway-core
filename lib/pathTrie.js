const _ = require("lodash");
function matchPath(patho, bTrie) {
  var matchedWIN = false;
  var segs = patho.split("/").filter(n => n !== "");
  var matched = bTrie;

  var currentSeg;
  for (var i = 0; i < segs.length; i++) {
    // console.log('hi', i);
    currentSeg = segs[i];
    // if (typeof matched[currentSeg] ==='undefined') {
    //   // console.log('segs.splice(i', segs.splice(i));

    //   return matchedWIN;
    //    // + segs.splice(i-1).join();
    // }
    if (matched[currentSeg] || matched["*"]) {
      matched = matched[currentSeg] || matched["*"];
      if (matched["***"]) matchedWIN = matched["***"];
      if (i === segs.length - 1) return matchedWIN;
      // else
    }
    // else{
    // return matchedWIN;
    // }
    // else if(matched['***']) matched=matched['***']
  }
  return matchedWIN;
}
function buildTrie(ps) {
  let obj = {};

  ps.forEach(px => {
    let glob = {};
    let lastPath;
    px.base_path
      .split("/")
      .filter(p => p !== "" && p !== "/")
      .reduce((o, v, ind, src) => {
        if (src.length === ind + 1) {
          o[v] = { "***": px.url };
          lastPath = o;
        } else o[v] = {};
        return o[v];
      }, glob);
    // console.dir(glob, { depth: 10 });
    obj = _.merge(obj, glob);
    // console.log('lastPath', lastPath);

    // console.dir(lastPath,{depth:10});
  });

  // console.dir(obj,{depth:10});
  return obj;
}
module.exports = { matchPath, buildTrie };
