var Duplex = require('stream').Duplex;

module.exports = bufferStream

function bufferStream(){
  var s = new Duplex()
  s.string = ''
  s.lines = function(){
    return s.string.split('\n')
  }
  s._write = function (chunk, enc, next) {
    s.string += chunk
    next()
  }
  s._read = function (){
    var str = s.string
    if (this._writableState.ended){
      if (str.length > 0){
        s.push(str)
        s.string = ''
      }
      s.push(null)
    }else{
      s.push(str)
      s.string = ''
    }
  }
  s.reset = function(){
    s.string = ''
  }
  return s
}
