module.exports = Harness

var TapProducer = require("./tap-producer.js")
, TapTest = require("./tap-test.js")
, TapResults = require("./tap-results.js")
, assert = require("./tap-assert.js")

// Test is the class to use for new tests
function Harness (Test) {
  if (!(this instanceof Harness)) return new Harness(Test)

  var me = this

  this.output = new TapProducer()
  this.results = new TapResults()
  this.results.on("result", this.emit.bind(this, "result"))

  this._plan = null
  this._current = null
  this._children = null
  this._bailedOut = null

  // count of tests that count towards plan.  ie, top-level
  this._planCount = 0
  // count of all nested tests at all levels.
  this._testCount = 0

  Harness.super.call(this)
}

Harness.prototype.bailout = bailout
function bailout (message) {
  if (this._bailedOut) return
  message = message || true
  this.output.end({bailout: message})
  this._ended = true
  this._bailedOut = true
  process.nextTick(this.process.bind(this))
}

Harness.prototype.end = end
function end () {
  if (this._ended) return
  this._ended = true
  process.nextTick(this.process.bind(this))
}

function copyObj(o) {
  var copied = {}
  Object.keys(o).forEach(function (k) { copied[k] = o[k] })
  return copied
}

Harness.prototype.test = test
function test (name, conf, cb) {
  if (this._bailedOut || this._ended) return

  if (typeof conf === "function") cb = conf, conf = null
  if (typeof name === "object") conf = name, name = null
  if (typeof name === "function") cb = name, name = null

  conf = (conf ? copyObj(conf) : {})
  name = name || ""

  // Set to Infinity to have no timeout.
  if (isNaN(conf.timeout)) conf.timeout = 30000
  var t = new this._Test(this, name, conf)
  var me = this

  if (cb) {
    t.on("ready", function () {
      if (!isNaN(conf.timeout) && isFinite(conf.timeout)) {
        var timer = setTimeout(t.timeout.bind(t), conf.timeout)
        var clear = clearTimeout.bind(null, timer)
        t.on("end", clear)
        t.on("afterbailout", clear)
      }
      cb.call(t, t)
    })
  }

  this._children.push(t)

  process.nextTick(this.process.bind(this))
  return t
}

// the tearDown function is *always* guaranteed to happen.
// Even if there's a bailout.
Harness.prototype.tearDown = function (fn) {
  this.on("end", fn.bind(this, this))
}

Harness.prototype.process = process
function process () {
  // if already processing, then just exit.
  if (this._processing) return
  this._processing = true

  if (this._bailedOut) {
    // do not pass go, do not collect $200
    // the bailout result was already written to the output.
    return
  }

  var current = this._children.shift()
  while (current && current.conf.skip) {
    this.results.add(assert.fail(current.conf.name,
                                 { skip: true, diag:false }))
  }

  // run the current test
  // when it's over, handle the child end.
  if (current) {
    this._planCount ++
    this._current = current
    current.on("end", this.childEnd.bind(this))
    current.emit("ready")
    return
  }

  // no more children.
  // either we've ended, ran through the entire plan,
  // or we're waiting for more children.
  if (this._planCount === this._plan) this._ended = true
  if (this._ended) this.harnessEnd()
  this._processing = false
}

Harness.prototype.harnessEnd 
