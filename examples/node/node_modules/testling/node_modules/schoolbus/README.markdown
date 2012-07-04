schoolbus
=========

Drive around a browser iframe over multiple page requests using a
[postMessage](https://developer.mozilla.org/en/DOM/window.postMessage) bus.

example
=======

In the page(s) you want to drive around, insert the
[browserified](https://github.com/substack/node-browserify)
`proxy.js` file from this distribution:

```
$ browserify proxy.js -o proxy_bundle.js
```

``` html
<script src="/proxy_bundle.js"></script>
```

Ideally you could insert this script tag at the top of all text/html responses
with a custom proxy but putting the tag in yourself manually works too.

Now you can boss those other pages around, like this:

``` js
var schoolbus = require('schoolbus');
var domready = require('domready');

domready(function () {
    var uri = 'http://localhost:7272/test-form/';
    var bus = schoolbus(uri, function (win, $) {
        console.log('href[0]=' + win.location.href);
        
        var form = $('#form')[0];
        $('input[name=login]').val('testling');
        $('input[name=passw]').val('qwerty');
        $('form').submit();
    });
    
    bus.next(function (win, $) {
        console.log('href[1]=' + win.location.href);
        console.log($('#welcome p:first').text());
    });
    
    bus.appendTo(document.body);
});
```

which when run against our particular pages will log the following output:

```
href[0]=http://localhost:7272/test-form/
href[1]=http://localhost:7272/test-form/login
Login successful.
```

Note that the code seems to have spanned multiple browser requests without
resorting to a fancy webdriver-style plugin architecture and the API is entirely
javascript-driven.

methods
=======

``` js
var schoolbus = require('schoolbus')
```

var bus = schoolbus(uri, vars={}, cb)
-------------------------------------

Return a new bus starting at `uri`.

Optionally, you can specify some variables `vars` which will be sent over the
postMessage bus using
[dnode-protocol](http://github.com/substack/dnode-protocol)
so you can send circular objects and callbacks.
Just don't try to send dom nodes.

If you specify a callback `cb`, then `bus.next(cb)` will register a listener
when the page contents become available.

bus.next(cb)
------------

Register a callback `cb` for the next available page transition.

Each transition fires a registered callback FIFO, so you can build up a queue of
callbacks to script what happens when multiple pages are visited.

The `cb` will be stringified with `.toString()` and evaluated in the new page
context, but with the variables bound when `schoolbus()` was called. 

bus.navigate(uri)
-----------------

Drive the bus to `uri`.

events
======

bus.on('open', loc)
-------------------

Fired when a remote page loads in the iframe that has the proxy.js script.
`loc` is a copy of the page's `window.location` object.

install
=======

With [npm](http://npmjs.org) do:

```
npm install schoolbus
```

then build `proxy.js` with browserify and drop it into the pages you want to
drive around.

license
=======

MIT
