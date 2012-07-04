#!/bin/bash
browserify ../../proxy.js -o static/proxy.js
browserify test.js -o static/test.js
