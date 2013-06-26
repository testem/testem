;(function(p,c,e){function r(n){if(!c[n]){if(!p[n])return;c[n]={exports:{}};p[n][0](function(x){return r(p[n][1][x])},c[n],c[n].exports);}return c[n].exports}for(var i=0;i<e.length;i++)r(e[i]);return r})({0:[function(require,module,exports){var robot = require('./robot');
console.log(robot('beep'));

},{"./robot":1}],1:[function(require,module,exports){module.exports = function (s) { return s.toUpperCase() + '!' };

},{}]},{},[0]);