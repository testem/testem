# Ecstatic

A simple static file server middleware that works with both Express and Flatiron

* Built-in simple directory listings
* Shows index.html files at directory roots when they exist
* Use it with a raw http server, express/connect, or flatiron/union!

# Examples:

## express

``` js
var express = require('express');
var ecstatic = require('ecstatic');

var app = express.createServer();
app.use(ecstatic(__dirname + '/public'));
app.listen(8080);

console.log('Listening on :8080');
```

## union

``` js
var union = require('union');
var ecstatic = require('ecstatic');

union.createServer({
  before: [
    ecstatic(__dirname + '/public'),
  ]
}).listen(8080);

console.log('Listening on :8080');
```

## flatiron

``` js
var union = require('union');
var flatiron = require('flatiron');
var ecstatic = require('ecstatic');

app = new flatiron.App();
app.use(flatiron.plugins.http);

app.http.before = [
  ecstatic(__dirname + '/public')
];

app.start(8080);

console.log('Listening on :8080');
```

# API:

## ecstatic(folder, opts={});

Pass ecstatic a folder, and it will return your middleware!

Turn on cache-control with `opts.cache`, in seconds.

Turn off directory listings with `opts.autoIndex === false`.

### middleware(req, res, next);

This works more or less as you'd expect.

## ecstatic.showDir(folder);

This returns another middleware which will attempt to show a directory view. Turning on auto-indexing is roughly equivalent to adding this middleware after an ecstatic middleware with autoindexing disabled.

# Tests:

    npm test

# License:

MIT/X11.
