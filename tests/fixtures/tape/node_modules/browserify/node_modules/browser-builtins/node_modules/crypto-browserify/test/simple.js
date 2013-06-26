var test = require("tape")

var crypto = require('crypto')
var cryptoB = require('../')
var assert = require('assert')

function assertSame (fn) {
  test(fn.name, function (t) {
    fn(crypto, function (err, expected) {
      fn(cryptoB, function (err, actual) {
        t.equal(actual, expected)
        t.end()
      })
    })
  })
}

assertSame(function sha1 (crypto, cb) {
  cb(null, crypto.createHash('sha1').update('hello', 'utf-8').digest('hex'))
})

assertSame(function md5(crypto, cb) {
  cb(null, crypto.createHash('md5').update('hello', 'utf-8').digest('hex'))
})

assert.equal(cryptoB.randomBytes(10).length, 10)
test('randomBytes', function (t) {
  cryptoB.randomBytes(10, function(ex, bytes) {
    assert.ifError(ex)
    bytes.forEach(function(bite) {
      assert.equal(typeof bite, 'number')
    })
    t.end()
  })
})
