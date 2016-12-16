const async = require('async');
const debug = require('debug')('gateway:main');

const Transform = require('stream').Transform;
//const logger = require('./logging').getLogger();
const empty_buffer = new Buffer(0);

class OnDataTransform extends Transform {

  constructor(context) {
    super({ objectMode: false });
    this.pluginHooks = context.pluginHooks;
  }
}

OnDataTransform.prototype._transform = function (data, encoding, done) {
  console.log("In transform, processing: ", data);
  debug('req data', data ? data.length : 'null');
  var self = this;
  async.seq.apply(this, self.pluginHooks)(data,
    function(err, result) {
      if (err) {
        console.log('Error: ', err);
        done(err);
      }
      else {
        if(result) {
          console.log("Result in transform: ", result);
          self.push(result);
        }
        done();
      }
    });
}

module.exports = OnDataTransform;