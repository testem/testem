Contributing to Testem
======================

Open source is all about DIY! If you want something fixed, it's sometimes faster to just roll your sleeves up, not to mention lots more rewarding. This doc will give you some pointers on where to look when you poke around Testem's source code.

Brief Code Walk Through
-----------------------

`testem.js` is the main entry point of the program. It then delegates to either `lib/dev_mode_app.js` or `lib/ci_mode_app.js` depending on whether it's development mode `testem` or continuous integration mode `testem ci`. All of the rest of the Node application's source is under the `lib` folder. You can probably figure out the rest from there.

The source code for the browser side is under the folders `public/testem` and `views`

* `public/testem` - is where the client side assets are (Javascript and CSS)
* `views` - are HTML templates used to generate default test runner pages

Tests and Examples
------------------

To check that you didn't accidentally break stuff while mucking around, you can run the tests. 

	npm test

This runs the unit tests on the Node side of things. 

### Integration Tests

There are also some integrations tests that test running all the examples in the `examples` folder by cd'ing into each and executing `testem ci`

On Unix do

	tests/integration/browser_tests.sh

and on Windows do

	tests/integration/browser_tests.bat

Coding Style
------------

This is where I am going deviate from the norm. I am a *semicolon-less*, *leading comma* kind of guy. It is unconventional, but there's is [method](http://npmjs.org/doc/coding-style.html) [to](https://gist.github.com/2037204) [the](http://mir.aculo.us/2012/04/16/writing-semicolon-less-javascript-the-for-people-who-want-to-get-stuff-done-edition/) [madness](http://inimino.org/~inimino/blog/javascript_semicolons). *You are not required to follow my coding style.* The only principles you should follow are

1. Have fun.
2. Be thoughtful of others.