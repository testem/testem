/* globals window */
'use strict';

window.hello = function(name) {
  return 'hello ' + (name || 'world');
};
