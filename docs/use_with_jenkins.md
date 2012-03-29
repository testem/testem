Using Testem with Jenkins
=========================

This document details the steps for using Testem with Jenkins. It assumes that you have installed Testem and PhantomJS, have setup Testem to work in the top level of your project, and that you already have a working Jenkins installation set up.

Step 1: Link PhantomJS to `/usr/local/bin`
------------------------------------------

If you haven't done so already, soft link the `phantomjs` executable to `/usr/local/bin/phantomjs`, something like

    ln -s /usr/local/phantomjs-x.y.z/bin/phantomjs /usr/local/bin/phantomjs
    
This enables Testem to find the executable.

Step 2: Install the TAP Plugin
------------------------------

Now, in the Jenkins web console, go to "Manage Jenkins" in the top level side bar menu and then select "Manage Plugins". Select the "Available" tab and find the "TAP Plugin" in this long list of plugins, check the box next to it and then hit the "Install without restart" button, you'll wait several seconds for it to download the plugin and install it.

Step 3: Create a New Job
------------------------

For your project, create a "New Job" in Jenkins. In the first screen, choose a "Job name" and select "Build a free-style software project". 

Setup your Source Code Management and Build triggers, this is dependent on what version control tool you use. *Sorry, but you are on your own for this part.*

Hit "Add build step" and select "Execute shell" - or "Execute Windows batch command" if you are on Windows. In the "Command" text area, paste this code

    export PATH=$PATH:/usr/local/bin:/sbin
    testem ci > tests.tap
    
Under "Post-build Actions", check "Publish TAP Results", then in "Test results" put `tests.tap`.

Finally, hit the "Save" button.

Now click "Build Now" to test the build. ***Good luck!***


