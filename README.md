#Microgateway 

interface requires that you pass options like 

var opts = {
  
  key:string, //key
  
  secret:string, //secret
  
  source:configSourcePathString,//path to config
  
  module:bool // run as module
  
  }
  
var gateway = require('edgemicro')(opts)
gateway.start();

the config contains the path to the plugins directory