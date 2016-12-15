'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var PassThrough = require('stream').PassThrough;
var Bluebird = require('bluebird');

function ReportFile(reportFile, out) {
  this.file = reportFile;
  this.disableOut = true;

  this.outputStream = new PassThrough();

  mkdirp.sync(path.dirname(path.resolve(reportFile)));

  var fileStream = fs.createWriteStream(reportFile, { flags: 'w+' });

  this.outputStream.on('data', function(data) {
    if (!this.disableOut) {
      out.write(data);
    }
    fileStream.write(data);
  }.bind(this));

  var alreadyEnded = false;
  function finish(data) {
    if (!alreadyEnded) {
      alreadyEnded = true;
      fileStream.end(data);
    }
  }

  this.outputStream.on('end', finish);
  this.outputStream.on('error', finish);

  this.closePromise = new Bluebird.Promise(function(resolve, reject) {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  this.fileStream = fileStream;
}

ReportFile.prototype.close = function() {
  this.outputStream.end();

  return this.closePromise;
};

ReportFile.prototype.disableOut = function() {
  this.disableOut = true;
}

module.exports = ReportFile;
