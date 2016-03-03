'use strict';
const fs = require('fs');
const path = require('path');
const debug = require('debug')('gateway:init');
const util = require('util')
const yaml = require('js-yaml');
const _ = require('lodash');
const assert = require('assert')
const logging = require('./logging');
const configService = require('./config');
const stats = require('./stats');


var Plugins = function () {
  this.config = configService.get();
};



/**
 * calls init and returns plugin loaded
 * @param options {pluginName,plugin}
 * @returns {*}
 */
Plugins.prototype.loadPlugin = function (options) {
  var name;
  var plugin;
 
    if (_.isObject(options)) {
        assert(options.plugin, "must have plugin loaded in memory");
        if(_.isFunction(options.plugin)){
            plugin = options.plugin;
        }else {
            assert(_.isFunction(options.plugin.init), 'init must be a function');
            plugin = _.bind(options.plugin.init, options.plugin);
        }
        assert(options.pluginName, "must have plugin name");
        name = options.pluginName;
    } else {
        throw new Error('bad plugin')
    }
  const config = this.config;
  const logger = logging.getLogger();
  const stats = this.stats;


  var middleware;
  var subconfig = config[name];

  if (plugin) {
    middleware = plugin(subconfig, logger, stats);
    assert(_.isObject(middleware), 'ignoring invalid plugin handlers ' + name);
    middleware.id = name;
    console.info('installed plugin from', name);
  } else {
    console.error('error loading plugin', name);
  }
  return middleware
};

const _getPluginDirFromConfig = function (config) {
  var pluginDir;
  assert(config.edgemicro.plugins.dir, 'plugin dir not configured');

  assert(_.isString(config.edgemicro.plugins.dir), 'invalid plugin dir');

  pluginDir = path.normalize(config.edgemicro.plugins.dir);

  assert(fs.existsSync(pluginDir), 'plugin dir does not exist: ' + pluginDir);

  const stat = fs.statSync(pluginDir);
  assert(stat.isDirectory(), 'plugin dir is not a directory: ' + pluginDir);


  return pluginDir;
}

const _filterPluginDirectories = function (pluginDir) {
  const dirs = fs.readdirSync(pluginDir);
  assert(dirs, 'error reading plugin dir: ' + pluginDir);
  const pluginDirs = dirs.filter(function (dir) {
    const fulldir = path.join(pluginDir, dir);

    // a plugin contains package.json in root
    const pkg = path.join(fulldir, 'package.json');
    if (!fs.existsSync(pkg)) {
      return false;
    }
    const pstat = fs.statSync(pkg);
    if (!pstat.isFile()) {
      return false;
    }

    // a plugin contains index.js in root
    const index = path.join(fulldir, 'index.js');
    if (!fs.existsSync(index)) {
      return false;
    }
    const istat = fs.statSync(index);
    if (!istat.isFile()) {
      return false;
    }

    return true;
  });
  return pluginDirs;
}
exports = module.exports = function () {
  return new Plugins();
};

