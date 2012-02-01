Test&rsquo;em &rsquo;Scripts!
=================

Unit testing Javascripts shouldn't be an effing PITA. `testem` is a command-line tool which aims to make cross browser Javascript unit testing much more tolerable.

This project is a spin-off of [Tutti](https://github.com/airportyh/Tutti). I first thought I would repurpose Tutti to become a unit testing tool, but after much deliberation, decided to start a new project for this very purpose instead.

Usage:

***TODO***

Minimal Example:
----------------
1) Create a director at the same level as testem

    mkdir testem-sample

2) Create the following code and specification javascript files

    mkdir testem-sample/lib
    cat > testem-sample/lib/hello.js <<EOF
    function hello(){
        return "hello world"
    }
    EOF

    mkdir testem-sample/spec
    cat > testem-sample/spec/hello_spec.js <<EOF
    describe('hello', function(){
        it('should say hello', function(){
            expect(hello()).toBe('hello world')
        })
        it('should not say not hello', function(){
            expect(hello()).toNotBe('not hello world')
        })
        it('should be able to add', function(){
            expect(1+2).toBe(4)
        })
    })
    EOF

3) Create a testem configuration file

    cat > testem-sample/testem.yml <<EOF
    framework: jasmine
    src_files:
      - lib/hello.js
      - spec/hello_spec.js
    EOF

4) Launch testem

    cd testem-sample
    ../testem/cmd.js --config testem.yml

    TEST'EM 'SCRIPTS!
    -
    Open the URL below in a browser to connect.
    http://www.xxx.yyy.zzz:3580

    No browser selected.

5) Attach a browser by navigating to http://www.xxx.yyy.zzz:3580

6) See the test results

    Chrome 10.0
        2/3
    hello should be able to add.
        Expected 3 to be 4.
        Error: Expected 3 to be 4.

As expected, one expectation not met.


Include Snippet
---------------

Include this snippet directly after your `jasmine.js` include to enable *Testem* with your
test page

    <script>
    if (location.hash === '#testem')
        document.write('<script src="/jasmine_adapter.js"></'+'script>')
    </script>

For QUnit, include this snippet

    <script>
    if (location.hash === '#testem')
        document.write('<script src="/qunit_adapter.js"></'+'script>')
    </script>

Using the Text User Interface
=============================
Keys

 * ENTER : Run the tests
 * q : Quit
 * <- LEFT ARROW  : Move to the next browser tab on the left
 * -> RIGHT ARROW : Move to the next browser tab on the right

Work Arounds For Known Issues
=============================
1) Cannot find module './lib/js-yaml.js'

This is an issue in the upstream js-yaml.  The work around is described
here: https://github.com/nodeca/js-yaml/pull/35

    npm install https://github.com/nodeca/js-yaml/tarball/master

    or if you download the tar.gz locally

    npm install nodeca-js-yaml-0.3.5-0-g44441b0.tar.gz


License
-------

(The MIT License)

Copyright (c) 2011 Toby Ho &lt;airportyh@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
