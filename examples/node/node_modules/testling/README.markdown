# testling

Write tests for the browser or node.

Run them with local browsers or hosted browsers from
[testling.com](http://testling.com).

# example

Just write a simple test:

``` js
var test = require('testling');

test('json parse', function (t) {
    t.same(JSON.parse('[1,2]'), [1,2]);
    t.log('beep boop');
    t.end();
});
```

then run it with a local browser:

```
$ testling example/test.js --browser=chrome
>> beep boop
TAP version 13
# json parse
ok 1 should be equivalent

1..1
# tests 1
# pass  1

# ok
```

Your local browsers will be detected using
[browser-launcher](https://github.com/substack/browser-launcher).

To see a list of detected local browsers, do `testling list`:

```
$ testling list
chrome/17.0.963.12
chromium/18.0.1025.168
phantom/1.4.0
firefox/12.0
```

To run your test on remote testling browsers, first open a testling tunnel:

```
$ testling tunnel
# ssh -NR 57594:localhost:54046 me@example.com
Enter passphrase for key '/home/substack/.ssh/id_dsa': 

```

then do:

```
$ testling example/test.js --browser=testling.chrome/12.0
>> beep boop
TAP version 13
# json parse
ok 1 should be equivalent

1..1
# tests 1
# pass  1

# ok
```

# test api

``` js
var test = require('testling')
```

The test api is just the [node-tap](https://github.com/isaacs/node-tap) api
plus:

## t.createWindow(uri, vars, cb)

Return a [schoolbus](https://github.com/substack/schoolbus) object to drive
around web pages.

## t.log(msg)

Log a message to the output.

# command-line usage

```
Usage:

  testling tunnel
  testling list
  testling OPTIONS [test files]

testling tunnel

  Open a testling ssh tunnel. This step is necessary before using testling
  browsers.
  
testling list

  List local available browsers.

testling OPTIONS [test files]

  Run the test files in the given browser.
  
  OPTIONS:

    --browser   Run the tests with this browser. Prepend 'testling.' to run your
                tests in a testling remote browser.
                Full browser list: http://testling.com/browsers.json

    --headless  For local browsers, run in headless mode.
                Requires that you have the `Xvfb` command in $PATH.

```

# install

With [npm](http://npmjs.org) just do:

```
npm install -g testling
```

![attack of the testlings!](http://substack.net/images/browsers/war_of_the_browsers.png)
