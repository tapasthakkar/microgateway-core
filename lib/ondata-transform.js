const async = require('async');
const debug = require('debug')('gateway:main');
const Transform = require('stream').Transform;

class OnDataTransform extends Transform {
  constructor(context) {
    super({ objectMode: false });
    this.pluginHooks = context.pluginHooks;
  }
}

OnDataTransform.prototype._transform = function (data, encoding, done) {
  debug('req data', data ? data.length : 'null');
  var self = this;
  async.seq.apply(this, self.pluginHooks)(data,
    function(err, result) {
      if (err) {
        console.error(err);
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