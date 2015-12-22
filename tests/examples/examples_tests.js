var expect = require('chai').expect;
var path = require('path');

var App = require('../../lib/app');
var Config = require('../../lib/config');

var FakeReporter = require('../support/fake_reporter');

describe('examples', function() {
  this.timeout(15000);

  it('runs buster', function(done) {
    testExample(path.join('examples/buster'), done);
  });

  it('runs custom_adapter', function(done) {
    testExample(path.join('examples/custom_adapter'), done);
  });

  it('runs jasmine', function(done) {
    testExample(path.join('examples/jasmine_simple'), done);
  });

  it('runs jasmine2', function(done) {
    testExample(path.join('examples/jasmine2'), done);
  });

  it('runs mocha with chai', function(done) {
    testExample(path.join('examples/mocha_chai_simple'), done);
  });

  it('runs mocha', function(done) {
    testExample(path.join('examples/mocha_simple'), done);
  });

  it('runs qunit', function(done) {
    testExample(path.join('examples/qunit_simple'), done);
  });

  it('runs lazy qunit', function(done) {
    testExample(path.join('examples/qunit_lazy'), done);
  });

  it('runs routes', function(done) {
    testExample(path.join('examples/routes'), done);
  });
});

function testExample(example_path, cb) {
  var reporter = new FakeReporter();
  var config = new Config('ci', {
    port: 0,
    config_dir: example_path,
    cwd: example_path,
    reporter: reporter,
    launch_in_ci: ['phantomjs']
  });
  config.read(function() {
    var app = new App(config, function(code) {
      expect(code).to.eq(0);
      expect(reporter.results.length).to.eq(2);
      cb();
    });
    app.start();
  });
}
