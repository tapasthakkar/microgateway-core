'use strict'
var config = {};
var configService = module.exports = {}

configService.get = () => {
  return config
};

configService.init = (newConfig) => {
  config = newConfig;
  // merge keys into config
  if (!config.edgemicro) {
    config.edgemicro = {plugins: {}};
  }
}

