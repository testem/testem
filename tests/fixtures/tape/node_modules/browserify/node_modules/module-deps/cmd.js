#!/usr/bin/env node
var mdeps = require('./');
var JSONStream = require('JSONStream');

var stringify = JSONStream.stringify();
stringify.pipe(process.stdout);

mdeps(process.argv.slice(2)).pipe(stringify);
