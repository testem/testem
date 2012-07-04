
var es  = require('../')
  , it  = require('it-is')
  , d   = require('ubelt')
 
exports ['gate buffers when shut'] = function (test) {

  var hundy = d.map(1,100, d.id)
    , gate = es.gate()
    , ten = 10
  es.connect(
    es.readArray(hundy),
    //es.log('after readArray'),
    gate,
    //es.log('after gate'),
    es.map(function (num, next) {
      //stick a map in here to check that gate never emits when open
      it(gate.isShut()).equal(false)
      
      if(!--ten) {
        gate.shut()
        d.delay(gate.open,10)()
        ten = 10
      }
        
      next(null, num)
    }),
    es.writeArray(function (err, array) { //just realized that I should remove the error param. errors will be emitted
      console.log('eonuhoenuoecbulc')
      it(array).deepEqual(hundy)
      test.done()
    })
  )

  gate.open()

}
