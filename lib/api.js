var log = require('winston')
var Config = require('./config')
var Backbone = require('backbone')

/*
  CLI-level options:

  file:                 [String]  configuration file (testem.json, .testem.json, testem.yml, .testem.yml)
  host:                 [String]  server host to use (localhost)
  port:                 [Number]  server port to use (7357)
  launch:               [Array]   list of launchers to use for current runs (defaults to current mode)
  skip:                 [Array]   list of launchers to skip
  debug:                [Boolean] debug mode (false)
  test_page:            [String]  path to the page to use to run tests
  growl:                [Boolean] enables growl (false)

  Config-level options:

  launch_in_dev:        [Array]   list of launchers to use for dev runs
  launch_in_ci:         [Array]   list of launchers to use for CI runs
  timeout:              [Number]  timeout for a browser
  framework:            [String]  test framework to use
  url:                  [String]  url server runs at (http://{host}:{port}/)
  src_files:            [Array]   list of files or file patterns to use
  serve_files:          [Array]   list of files or file patterns to inject into test playground (defaults to src_files)
  watch_files:          [Array]   list of files or file patterns to watch changes of (defaults to src_files)
  css_files:            [Array]   additionals stylesheets to include
  cwd:                  [Path]    directory to use as root
  parallel:             [Number]  max number of parallel runners (1)
  routes:               [Hash]    overrides for assets paths
  fail_on_zero_tests:   [Boolean] whether process should exit with error status when no tests found

  Available hooks:

  on_start:             Runs on suite startup
  before_tests:         Runs before every run of tests
  after_tests:          Runs after every run of tests
  on_exit:              Runs before suite exits
*/


var EventLogger = Backbone.Model.extend({
  initialize: function(attrs){
    this.set({
      name: attrs.name
      , allPassed: true
      , messages: new Backbone.Collection()
    })
  },
  clear: function() {
    this.get('messages').reset([])
  },
  hasMessages: function() {
    var messages = this.get('messages')
    return messages.length > 0
  },
  hasResults: function() { return false; },
  addMessage: function( type, message, color ){
    var messages = this.get('messages')
    messages.push({ type: type, text: message, color: color })
  },
  startTests: function() {}
} )

function Api(){}

Api.prototype.setup = function(mode, dependency){
  var self = this
  var App = require(dependency)
  var config = this.config = new Config(mode, this.options)
  this.configureLogging()
  log.info("Test'em starting...")
  config.read(function() {
    self.app = new App(config)
    self.app.start()
  })
}

Api.prototype.configureLogging = function(){
  log.remove(log.transports.Console)
  if (this.config.get('debug')){
    log.add(log.transports.File, {filename: 'testem.log'})
  }
}

Api.prototype.startDev = function(options){
  this.options = options
  this.setup('dev', './dev_mode_app.js')
}

Api.prototype.restart = function() {
  this.app.startTests( function() {} )
}

Api.prototype.startCI = function(options){
  this.options = options
  this.setup('ci', './ci')
}

Api.prototype.startServer = function(options){
  this.options = options
  var config = this.config = new Config('server', this.options)
  config.read(function() {
    var Server = require('./server')
    var server = new Server(config)
    server.start()
    server.on('server-start', function(){
      console.log('Open ' + config.get('url') + ' in a browser to connect.')
    })
  })
}

Api.prototype.getLogger = function( name ) {
  var logger = new EventLogger({ name: name })
  return logger
}

Api.prototype.addTab = function( logger ) {
  this.app.runners.push( logger )
}

module.exports = Api
