const http = require('http');
var events = require('events');
let proxies =require('./5000prox.js');
var aemit = new events.EventEmitter();
var emitter = new(require('events')).EventEmitter();
function httpGetEvent(u) {

        http.get('http://localhost:8810'+u,(resp)=>{
            resp.on('error', (err)=>aemit.emit('err', err));
            resp.on('data',()=>{});
            resp.on('end',()=>aemit.emit('cool',resp.statusCode))
        });
}
aemit.on('getit', httpGetEvent);
let cnt = 0;
function aem(code) {

  console.log('code', code, cnt++);
  
  return aemit.emit('getit', proxies[cnt].base_path);
};

aemit.on('cool', aem);
aemit.emit('getit', proxies[cnt++].base_pat);

aemit.on('ping1', function () {
	console.log('ping1');
	aemit.emit('pong1');
})
aemit.on('pong1', function () {
	console.log('pong1');
	aemit.emit('ping2');
})
aemit.on('ping2', function () {
	console.log('ping2');
	aemit.emit('pong2');
});
aemit.on('pong2', function () {
	console.log('pong2');
})

emitter.on('ping1', function () {
	console.log('ping1 e');
	emitter.emit('pong1');
})


aemit.emit('ping1');
