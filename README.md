Test&rsquo;em &rsquo;Scripts!
=================

Unit testing Javascripts is a PITA. Testem is a command-line tool that aims to make cross browser Javascript unit testing much more tolerable. Testem supports Jasmine and QUnit right out of the box.

Installation
------------
To install:

    sudo npm install testem -g
    
This will install the `testem` executable globally on your system, specifically it should be `/usr/local/bin/testem` for unix.

Usage
-----

Testem supports two distinct use cases: development and continuous integration.

### Development Mode

The simplest way to use Testem, in the TDD spirit, is to start in an empty directory and run the command

    testem
    
You will see a terminal-based interface which looks like this
    
    TEST'EM 'SCRIPTS!                                                                                         
    Open the URL below in a browser to connect.                                                                
    http://192.168.1.173:3580                                                                                  


    No browser selected.  
    
Now open your browser and go to the specified URL. You should now see

    TEST'EM 'SCRIPTS!                                                                                          
    Open the URL below in a browser to connect.                                                                
    http://192.168.1.173:3580                                                                                  
      Chrome 16.0                                                                                              
          0/0                                                                                                  
    No browser selected.  
    
We see 0/0 for tests because at this point we haven't written any code, but as we write them, Testem will pickup any `.js` files
 that were added, include them, and if there are tests, run them automatically. So let's first write `hello_spec.js` in the spirit of "test first"(written in Jasmine)

    describe('hello', function(){
        it('should say hello', function(){
            expect(hello()).toBe('hello world')
        })
    })

We implement the spec like so in `hello.js`

    function hello(){
        return "hello world"
    }

Testem should automatically pickup the new files you've added and also any changes that you make to them, and rerun the tests. So you should now see

    TEST'EM 'SCRIPTS!                                                                                          
    Open the URL below in a browser to connect.                                                                
    http://192.168.1.173:3580                                                                                  
      Chrome 16.0                                                                                              
          1/1                                                                                                  
    All tests passed!     

### Continuous Integration Mode

To use Testem for continuous integration you'd use its `ci` command

    testem ci
    
You'd see output like this
    
    Open the URL below in a browser to connect.
    http://192.168.1.173:3580
    Ok! Starting tests with browsers: Chrome 16.0
    .
    Chrome 16.0: 1/1
    
In CI mode, Testem waits for a specified number of browsers to connect before starting the tests - the 
default number is 1. You can change this number using the `-w` flag, to for example test on 2 browsers

    testem ci -w 2
    
Configuration File
------------------

For the simplest Javascript projects, the above workflow will work fine, but there are times when you want
to structure your sources files into separate directories, or want to have finer control over what files to include, this calls for the `testem.yml` configuration file. It looks like this

    framework: jasmine
    src_files:
    - hello.js
    - hello_spec.js

Custom Test Pages
-----------------

You can also use a custom page for testing. To do this, first you need to specify `test_page` to point to your test page in the config file(`framework` and `src_files` are irrelevant in this case)

    test_page: tests.html
    
Next, the test page you use needs to have the adapter code installed on them, as specified in the next section.

### Include Snippets

If you are using Jasmine, include this snippet directly after your `jasmine.js` include to enable *Testem* with your
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
-----------------------------

Keys

 * ENTER : Run the tests
 * q : Quit
 * ← LEFT ARROW  : Move to the next browser tab on the left
 * → RIGHT ARROW : Move to the next browser tab on the right
 * ↑ UP ARROW : scroll up in the error window
 * ↓ DOWN ARROW : scroll down in the error window
 * Option/Alt-← : scroll left in the error window
 * Option/Alt-→ : scroll right in the error window

Go Completely Headless with PhantomJS!
--------------------------------------

If you have [PhantomJS](http://www.phantomjs.org/) installed in your system and the `phantomjs` executable is in your path, Testem will use it automatically to run your tests for your convenience. ***Installing [PhantomJS](http://www.phantomjs.org/) is highly recommended***!

License
-------

(The MIT License)

Copyright (c) 2011 Toby Ho &lt;airportyh@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
