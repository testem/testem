Test&rsquo;em &rsquo;Scripts!
=================

Javascript unit testing is a PITA. Testem aims to make Javascript unit testing in browsers as easy as it possibly can be - so that you will no longer have any excuse for *not writing tests*. Testem supports [Jasmine](http://pivotal.github.com/jasmine/) and [QUnit](http://docs.jquery.com/QUnit) right out of the box. It supports two distinct use-cases: the *test-driven-development* workflow; and *continuous integration*.

Requirements
------------

You need [Node](http://nodejs.org/) version 0.6.2 or later installed on your system.

Installation
------------
To install:

    npm install testem -g
    
This will install the `testem` executable globally on your system.

Usage
-----

As stated before, Testem supports two use cases: test-driven-development and continuous integration. Let's go over each one.

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
    
Save that file and now you should see

    TEST'EM 'SCRIPTS!                                                                                          
    Open the URL below in a browser to connect.                                                                
    http://192.168.1.173:3580                                                                                  
      Chrome 16.0                                                                                              
          0/1
    hello should say hello.                                                                       
        x ReferenceError: Can't find variable: hello                                                                                                  
    No browser selected.

Testem should automatically pickup the new files you've added and also any changes that you make to them, and rerun the tests. The test fails as we'd expect. Now we implement the spec like so in `hello.js`

    function hello(){
        return "hello world"
    }

So you should now see

    TEST'EM 'SCRIPTS!                                                                                          
    Open the URL below in a browser to connect.                                                                
    http://192.168.1.173:3580                                                                                  
      Chrome 16.0                                                                                              
          1/1                                                                                                  
    All tests passed!  
    
#### Using the Text User Interface

In development mode, Testem has a text-based graphical user interface which uses keyboard-based controls. Here is a list of the control keys

* ENTER : Run the tests
* q : Quit
* ← LEFT ARROW  : Move to the next browser tab on the left
* → RIGHT ARROW : Move to the next browser tab on the right
* ↑ UP ARROW : scroll up in the error window
* ↓ DOWN ARROW : scroll down in the error window
* Option/Alt + ← : scroll left in the error window
* Option/Alt + → : scroll right in the error window   

#### Command line options

To see all command line options do

    testem --help

### Continuous Integration Mode

To use Testem for continuous integration you'd use its `ci` command

    testem ci
    
In CI mode, Testem runs your tests on all the browsers that are available on the system one after another. To find out what browsers are currently available - those that Testem knows about and can make use of

    testem ci -l
    
Will print them out. The output might look like

    $ testem ci -l
    Browsers available on this system: 
    IE7
    IE8
    IE9
    Chrome
    Firefox
    Safari
    Opera
    PhantomJS
    
Did you notice that this system has IE versions 7-9? Yes, actually it has only IE9 installed, but Testem uses IE's compatibility mode feature to emulate IE 7 and 8.

When you run `testem ci` to run tests, it outputs the results in the [TAP](http://testanything.org/wiki/index.php/Main_Page) format, which looks like

    ok 1 Chrome 16.0 - hello should say hello.

    1..1
    # tests 1
    # pass  1

    # ok
    
TAP is a human-readable and language-agnostic test result format. TAP plugins exist for popular CI servers

* [Jenkins TAP plugin](https://wiki.jenkins-ci.org/display/JENKINS/TAP+Plugin) - I've added [detailed instructions](https://github.com/airportyh/testem/blob/master/docs/use_with_jenkins.md) for setup with Jenkins.
* [TeamCity TAP plugin](https://github.com/pavelsher/teamcity-tap-parser)

#### Command line options

To see all command line options for CI, do

    testem ci --help
    
Configuration File
------------------

For the simplest Javascript projects, the above workflow will work fine, but there are times when you want
to structure your sources files into separate directories, or want to have finer control over what files to include, this calls for the `testem.yml` configuration file. It looks like this

    framework: jasmine
    src_files:
    - hello.js
    - hello_spec.js

The src_files can also be glob patterns (See: [node-glob](https://github.com/isaacs/node-glob))

    src_files:
    - js/**/*.js
    - spec/**/*.js

Custom Test Pages
-----------------

You can also use a custom page for testing. To do this, first you need to specify `test_page` to point to your test page in the config file(`framework` and `src_files` are irrelevant in this case)

    test_page: tests.html
    
Next, the test page you use needs to have the adapter code installed on them, as specified in the next section.

### Include Snippets

If you are using Jasmine, include this snippet directly after your `jasmine.js` include to enable *Testem* with your test page

    <script>
    if (location.hash === '#testem')
        document.write('<script src="/jasmine_adapter.js"></'+'script>')
    </script>

For QUnit, include this snippet directly after your 'qunit.js' include

    <script>
    if (location.hash === '#testem')
        document.write('<script src="/qunit_adapter.js"></'+'script>')
    </script>


Go Completely Headless with PhantomJS
-------------------------------------

If you have [PhantomJS](http://www.phantomjs.org/) installed in your system and the `phantomjs` executable is in your path. In development mode, Testem will use it automatically to run your tests for your convenience. For CI, PhantomJS will be one of the available browsers and will be made use of by default.

Credits
-------

Testem depends on these great software

* [Node](http://nodejs.org/)
* [Socket.IO](http://socket.io/)
* [PhantomJS](http://www.phantomjs.org/)
* [Node-Tap](https://github.com/isaacs/node-tap)
* [Node-Charm](https://github.com/substack/node-charm)
* [Node Commander](http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy)
* [JS-Yaml](https://github.com/nodeca/js-yaml)
* [Winston](http://blog.nodejitsu.com/put-your-logs-anywhere-with-winston)
* [Express](http://expressjs.com/)
* [jQuery](http://jquery.com/)

License
-------

(The MIT License)

Copyright (c) 2011 Toby Ho &lt;airportyh@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
