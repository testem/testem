var es = require('../')
  , it = require('it-is').style('colour')
  , d = require('ubelt')

var fizzbuzz = '12F4BF78FB11F1314FB1617F19BF2223FB26F2829FB3132F34BF3738FB41F4344FB4647F49BF5253FB56F5859FB6162F64BF6768FB71F7374FB7677F79BF8283FB86F8889FB9192F94BF9798FB'
  , fizz7buzz = '12F4BFseven8FB11F1314FB161sevenF19BF2223FB26F2829FB3132F34BF3seven38FB41F4344FB464sevenF49BF5253FB56F5859FB6162F64BF6seven68FBseven1Fseven3seven4FBseven6sevensevenFseven9BF8283FB86F8889FB9192F94BF9seven98FB'

exports ['fizz buzz'] = function (test) {

  var readThis = d.map(1, 100, function (i) {
    return (
     ! (i % 3 || i % 5) ? "FB" :    
      !(i % 3) ? "F" :
      !(i % 5) ? "B" :
      ''+i
    )
  }) //array of multiples of 3 < 100

  var reader = es.readArray(readThis)

  var join = es.join(function (err, string){
    it(string).equal(fizzbuzz)
    test.done()
  })
  reader.pipe(join)

}


exports ['fizz buzz replace'] = function (test) {
  var split = es.split(/(1)/)

  var replace = es.replace('7', 'seven')
  
  es.connect(split, 
    replace, 
//    es.log('aeounh'), 
    es.join(function (err, string) {
      it(string).equal(fizz7buzz) 
      test.done()
    })
  )

  split.write(fizzbuzz)
  split.end()

}
