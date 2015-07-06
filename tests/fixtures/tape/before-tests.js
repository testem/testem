'use strict';

var fs = require('fs');
var browserify = require('browserify');

var b = browserify();
b.add('./tests.js');
b.bundle().pipe(fs.createWriteStream('public/bundle.js'));
