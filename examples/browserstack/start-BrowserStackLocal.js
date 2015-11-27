#!/usr/bin/env node

var BrowserStackTunnel = require('browserstacktunnel-wrapper');
var pidFile = 'browserStackLocal.pid';
var fs = require('fs');

var browserStackTunnel = new BrowserStackTunnel({
  key: process.env.BROWSERSTACK_KEY,
  v: true
});

process.on('SIGINT', function() {
  if (browserStackTunnel !== null) {
    browserStackTunnel.stop(function(error) {
      if (error) {
        console.log(error);
      } else {
        console.log('BrowserStackLocal disconnected');
        process.exit();
      }
    });
  }
});

fs.writeFile(pidFile, process.pid);

browserStackTunnel.start(function(error) {
  if (error) {
    console.log(error);
  } else {
    console.log("Tunnel started");
  }
});
