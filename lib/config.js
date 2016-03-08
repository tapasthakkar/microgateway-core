'use strict'
var assert = require('assert');
var config = {};
var configService = module.exports = {}

configService.get = () => {
  assert(config, 'config not initialized')
  return config
};

configService.init = (newConfig) => {
  config = newConfig;
  // merge keys into config
  if (!config.edgemicro) {
    config.edgemicro = {plugins: {}};
  }
}

