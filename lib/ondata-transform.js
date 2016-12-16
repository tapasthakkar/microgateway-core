const async = require('async');
const debug = require('debug')('gateway:main');

const Transform = require('stream').Transform;
//const logger = require('./logging').getLogger();

class OnDataTransform extends Transform {

  constructor(context) {
    super({ objectMode: false });
    this.pluginHooks = context.pluginHooks;
    /* do some stuff */
  }
}

OnDataTransform.prototype._transform = function (data, encoding, done) {
  debug('req data', data ? data.length : 'null');
  var self = this;
  async.seq.apply(this, this.pluginHooks)(data,
    function(err, result) {
      if (err) {
        console.log('Error: ', err)//logger.error(err);
        done(err);
      }
      else {
        if(result) {
          self.push(result);
        }
        done();
      }
    });
}

module.exports = OnDataTransform;