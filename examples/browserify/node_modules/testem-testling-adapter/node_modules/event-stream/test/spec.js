/*
  assert that data is called many times
  assert that end is called eventually

  assert that when stream enters pause state,
  on drain is emitted eventually.
*/

var macgyver = require('macgyver')
var es = require('..')
var it = require('it-is').style('colour')

function applySpec (mac, stream) {
  function noop () {}
  var paused = false
  function drain() {
    paused = false
    console.log('drain!')
  }  
  stream.end = mac(stream.end).once()
  var onDrain = mac(drain).never()

  stream.pause = mac(stream.pause)
    .isPassed(function () {
      if(paused) return
      console.log('entered pause state by pause()')
      paused = true
      onDrain.again()
    })

  stream.on('drain', onDrain)
  stream.write = 
    mac(stream.write)
    .throws(function (err, threw) {
      it(threw).equal(!stream.writable)
    })
    .returns(function (written) {
      it(written)
        .typeof('boolean')     //be strict.
        .equal(!stream.paused) //expose pause state. must be consistant.

      if(!paused && !written) {
        //after write returns false, it must emit drain eventually.
        console.log('entered pause state by write() === false')
        onDrain.again()
      }
      paused = !written
    })

  var onClose = mac(noop).once()
  var onEnd   = mac(noop).once().before(onClose)
  var onData  = mac(noop).before(onEnd)

  stream.on('close', onClose)
  stream.on('end', onEnd)
  stream.on('data', onData)
}

exports['simple stream'] = function (test) {

  var mac = macgyver()
  var stream = es.through()
  applySpec(mac, stream)

    stream.write(1)
    stream.write(1)
    stream.pause()
    stream.write(1)
    stream.resume()
    stream.write(1)
    stream.end(2) //this will call write()

    process.nextTick(function () {
      mac.validate()
      test.done()
    })
    
}

exports['throw on write when !writable'] = function (test) {

  var mac = macgyver()
  var stream = es.through()
  applySpec(mac, stream)

  stream.write(1)
  stream.write(1)
  stream.end(2) //this will call write()
  stream.write(1) //this will be throwing..., but the spec will catch it.

  process.nextTick(function () {
    mac.validate()
    test.done()
  })
  
}

exports['end fast'] = function (test) {

  var mac = macgyver()
  var stream = es.through()
  applySpec(mac, stream)

  stream.end() //this will call write()

  process.nextTick(function () {
    mac.validate()
    test.done()
  })
  
}


/*
  okay, that was easy enough, whats next?

  say, after you call paused(), write should return false
  until resume is called.

  simple way to implement this:
    write must return !paused
  after pause() paused = true
  after resume() paused = false

  on resume, if !paused drain is emitted again.
  after drain, !paused

  there are lots of subtle ordering bugs in streams.

  example, set !paused before emitting drain.

  the stream api is stateful. 
*/


