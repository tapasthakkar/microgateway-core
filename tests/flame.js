"use strict";

const _ = require("lodash");
const assert = require("assert");
const gatewayService = require("../index");
// const request = require('request');
const http = require("http");
// const should = require('should');
const fs = require("fs");
// const {genProxies} = require('./genProxies.js');
const gatewayPort = 8810;
const proxies = [
  {
    base_path: "/ch/ne/t/etlz/x",
    secure: false,
    url: "http://localhost:8765/ls/iph/tetni"
  },
  {
    base_path: "/gf/awc/c",
    secure: false,
    url: "http://localhost:8765/oe/da/gturb/aaoizrd/henre/qp/cetgn"
  },
  {
    base_path: "/zm/p/noe/i",
    secure: false,
    url: "http://localhost:8765/at/roaagii"
  },
  {
    base_path: "/xe/un/as/dt/pqfn",
    secure: false,
    url: "http://localhost:8765/er/hpto/cr/deovd/wwlemsn/ur/hqxge/ieazarb/faemhios"
  },
  {
    base_path: "/et/ya/s/yn/eume",
    secure: false,
    url: "http://localhost:8765/en/tftttein/wwcwet/gpyinlhe"
  },
  {
    base_path: "/oe/h/t/dp/z",
    secure: false,
    url: "http://localhost:8765/ai/epf"
  }
];
// console.log('proxies', proxies);

const baseConfig = {
  edgemicro: {
    port: gatewayPort,
    logging: { level: "info", dir: "./tests/log" }
  },
  proxies
};

var gateway;
var server;

const startGateway = (config, handler, done) => {
  // baseConfig.proxies.concat(genProxies([],555));
  // const opts = {
  console.log("config", config);

  //   key: fs.readFileSync('./tests/server.key'),
  //   cert: fs.readFileSync('./tests/server.crt')
  // };
  // server = http.createServer(opts, handler);

  // server.listen(port, function() {
  // console.log(server.address());

  // console.log('%s listening at %s', server.name, server.url)

  gateway = gatewayService(config);

  done();
  // });
};

startGateway(
  baseConfig,
  (req, res) => {
    assert.equal("localhost:" + port, req.headers.host);
    res.end("OK");
  },
  () => {
    gateway.start(err => {
      // assert(!err, err);
    });
  }
);
process.on("exit", () => {
  gateway.stop();
});
