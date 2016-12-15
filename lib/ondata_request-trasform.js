var stream = require('stream')
var ondata_request_transform = new stream.Transform( { objectMode: false } )

const Transform = require('stream').Transform;

class MyTransform extends Transform {

  constructor(context) {
    this.context = context;
    /* do some stuff */
    super({ objectMode: false });
  }
}


MyTransform.prototype._transform = function (chunk, encoding, done) {
  var data = chunk.toString()
  if (this._lastLineData) data = this._lastLineData + data

  var lines = data.split('\n')
  this._lastLineData = lines.splice(lines.length-1,1)[0]

  lines.forEach(this.push.bind(this))
  done()
}

MyTransform.prototype._flush = function (done) {
  if (this._lastLineData) this.push(this._lastLineData)
  this._lastLineData = null
  done()
}

module.exports = liner