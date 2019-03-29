var abcFreq = 'aaaaaaaabbcccdddeeeeeeeeeeeefffggghhhhhhiiiiiiijjkkllllmmmnnnnnnnooooooooppqrrrrrrsssssstttttttttuuuvvwwwxyyyz';

function genAsdf(len,trail=false) {
  const l=Math.ceil(Math.random()*len);
  var strTmp='/'+deu();;
  for (var i = 0; i < l; i++) {
    const ll=Math.ceil(Math.random()*len);
    strTmp+='/';
    for(var ii=0; ii<ll; ii++) {
      // if(Math.random()>0.94) {strTmp+='/*'; break;}
      strTmp+=abcFreq.charAt(Math.floor(Math.random()*abcFreq.length));
    }
      // strTmp+='/';
    // if (Math.random()>0.9)  strTmp+='*'    
    // if(Math.random()>0.5) strTmp+='/';
  }
      // if(trail === true ** Math.random()>0.5) strTmp+='/';

  return strTmp;
}
// console.log(genAsdf());
function deu() {
  return abcFreq.charAt(Math.floor(Math.random()*abcFreq.length))+abcFreq.charAt(Math.floor(Math.random()*abcFreq.length));
}


function genProxies(proxList, count) {
for (let i = 0; i < count; i++) {
  proxList.push({base_path: genAsdf(4,true), 'secure': false, 'url': 'http://localhost:8765'+genAsdf(8)})
}
  return proxList;
 // [] { base_path: '/', secure: false, url: 'http://localhost:' + port }
}

// let proxies=genProxies([],50);
// console.log('proxies', proxies);


module.exports = {genProxies};