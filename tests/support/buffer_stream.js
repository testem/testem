var Writable = require('stream').Writable;

module.exports = bufferStream

function bufferStream(){
  var ws = Writable()
  ws.string = ''
  ws.lines = function(){
    return ws.string.split('\n')
  }
  ws._write = function (chunk, enc, next) {
      ws.string += chunk
      next()
  }
  ws.reset = function(){
    ws.string = ''
  }
  return ws
}