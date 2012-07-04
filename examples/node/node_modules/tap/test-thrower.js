var test = require('tap').test;

function getObj(cb) {
  cb(null);
}

test('keeps going', {abortOnFail: true}, function (t) {
  getObj(function (err, obj) {
    t.notOk(err, 'first');
    t.ok(obj, 'second');
    console.log('obj =', obj);
    obj.someMethod();
    t.end();
  });
});

test('should be hit', function (t) {
  t.pass('here i am')
  t.end()
})
/*
$ node k.js 
obj = undefined
# keeps going
ok 1 first
not ok 2 second
  ---
    file:   /Users/isaacs/dev/js/tap/k.js
    line:   4
    column: 3
    stack:  
      - getCaller (/Users/isaacs/dev/js/tap/lib/tap-assert.js:403:17)
      - Function.assert (/Users/isaacs/dev/js/tap/lib/tap-assert.js:19:16)
      - Test._testAssert [as ok] (/Users/isaacs/dev/js/tap/lib/tap-test.js:86:16)
      - /Users/isaacs/dev/js/tap/k.js:10:7
      - getObj (/Users/isaacs/dev/js/tap/k.js:4:3)
      - Test.<anonymous> (/Users/isaacs/dev/js/tap/k.js:8:3)
      - Test.<anonymous> (events.js:88:20)
      - Test.emit (/Users/isaacs/dev/js/tap/lib/tap-test.js:103:8)
      - GlobalHarness.<anonymous> (/Users/isaacs/dev/js/tap/lib/tap-harness.js:86:13)
      - EventEmitter._tickCallback (node.js:188:41)
  ...
not ok 3 TypeError: Cannot call method 'someMethod' of undefined
  ---
    type:    TypeError
    message: Cannot call method 'someMethod' of undefined
    code:    non_object_property_call
    errno:   ~
    file:    /Users/isaacs/dev/js/tap/k.js
    line:    4
    column:  3
    stack:   
      - /Users/isaacs/dev/js/tap/k.js:12:9
      - getObj (/Users/isaacs/dev/js/tap/k.js:4:3)
      - Test.<anonymous> (/Users/isaacs/dev/js/tap/k.js:8:3)
      - Test.<anonymous> (events.js:88:20)
      - Test.emit (/Users/isaacs/dev/js/tap/lib/tap-test.js:103:8)
      - GlobalHarness.<anonymous> (/Users/isaacs/dev/js/tap/lib/tap-harness.js:86:13)
      - EventEmitter._tickCallback (node.js:188:41)
    thrown:  true
  ...
# should be hit
ok 4 here i am

1..4
# tests 4
# pass  2
# fail  2
*/
