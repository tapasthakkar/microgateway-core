'use strict';
var debug = require('debug')('gateway:index');
var util = require('util');
var gateway = require('./lib/gateway');
var assert = require('assert');
var logging = require('./lib/logging');
var stats = require('./lib/stats');

var pluginsLib = require('./lib/plugins');
var uuid = require('uuid')
var configService = require('./lib/config');
var _ = require('lodash');

/**
 *
 * @param config must include {key:string,secret:string}
 * @param cb callback when started
 */
var Gateway = function (config) {
  assert(config, 'options must contain config')
  config.uid = uuid.v1()
  configService.init(config);
  logging.init()
  this.plugins = {};
  this.pluginLoader = pluginsLib();

  this.preventDuplicatePluginsPerProxy = {};
};


module.exports = function (config) {
  return new Gateway(config);
}

module.exports.Logging = logging;
Gateway.prototype.start = function (cb) {
  const logger =logging.getLogger();
  const config = configService.get();
  let plugins  = this.plugins;
  debug('starting edgemicro');
  //debug('loaded config ' + util.inspect(config, {colors: true}));
  gateway.start( plugins, function (err, server) {
    if (err) {
      console.error('error starting edge micro', err);
    }
    return cb(err, server)
  });
};

Gateway.prototype.stop = function(cb){
  gateway.stop(cb);
}

Gateway.prototype.addPlugin = function (proxy, name, plugin) {
  if (!this.preventDuplicatePluginsPerProxy[proxy.proxy_name]) {
      this.preventDuplicatePluginsPerProxy[proxy.proxy_name] = {};
  }
  if (this.preventDuplicatePluginsPerProxy[proxy.proxy_name][name]) {
    console.log("Plugin " + name + " already added for proxy " + proxy.proxy_name + ".  skipping");
    return;
  }
  this.preventDuplicatePluginsPerProxy[proxy.proxy_name][name] = true;

  assert(name,"plugin must have a name")
  assert(_.isString(name),"name must be a string");
  assert(_.isFunction(plugin),"plugin must be a function(config,logger,stats){return {onresponse:function(req,res,data,next){}}}");
  const handler = this.pluginLoader.loadPluginForProxy({plugin:plugin, pluginName:name, proxy: proxy}, gatherPluginConfigForProxy(name, proxy));
  var pluginMapKey = proxy.proxy_name;
  if (!this.plugins[pluginMapKey]) {
        this.plugins[pluginMapKey] = [];
      }
  this.plugins[pluginMapKey].push(handler);
};

const gatherPluginConfigForProxy = function(name, proxy) {
  let config = configService.get();
  var pluginConfig = {};

  if (proxy.plugins && proxy.plugins.find(function (plugin) {return Object.keys(plugin)[0] == name;}))
  {
      pluginConfig = proxy.plugins.find(function (plugin) {
          return Object.keys(plugin)[0] == name;
      })[name];
  }

  return _.merge({}, config[name] || {}, pluginConfig || {});
}

