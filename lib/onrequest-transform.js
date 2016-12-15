var stream = require('stream')
const Transform = require('stream').Transform;

class OnRequestTransform extends Transform {

  constructor(context) {
    this.context = context;
    this.pluginHooks = context.pluginHooks;
    /* do some stuff */
    super({ objectMode: false });
  }
}

OnRequestTransform.prototype._transform = function (data, encoding, done) {
  debug('req data', data ? data.length : 'null');
  async.seq.apply(this, this.pluginHooks)(data,
    function(err, result) {
      if (err) {
        logger.error(err);
        done(err);
      }
      if(result) {
        this.push(result);
        done();
      }
    });
}

OnRequestTransform.prototype._flush = function (done) {
  done()
}

module.exports = OnRequestTransform;