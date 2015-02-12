var Launcher = require('../lib/launcher')
var Config = require('../lib/config')
var expect = require('chai').expect
var assert = require('chai').assert
var bd = require('bodydouble')
var EOL = require('os').EOL
var stub = bd.stub

describe('Launcher', function(){
  var settings, launcher, config

  describe('via command', function(){
    beforeEach(function(){
      settings = {command: 'echo hello'}
      config = new Config(null, {port: '7357', url: 'http://blah.com/'})
      launcher = new Launcher('say hello', settings, config)
    })
    it('should instantiate', function(){
      expect(launcher.name).to.equal('say hello')
      expect(launcher.settings).to.equal(settings)
    })
    it('should launch something, and also kill it', function(done){
      launcher.launch()
      var data = ''
      launcher.process.stdout.on('data', function(chunk){
        data += String(chunk)
      })
      launcher.process.on('close', function(){
        expect(data).to.equal('hello' + EOL)
        done()
      })
    })
    it('should be process iff protocol is not browser', function(){
      settings.protocol = 'browser'
      expect(launcher.isProcess()).not.to.be.ok
      settings.protocol = 'tap'
      expect(launcher.isProcess()).to.be.ok
      delete settings.protocol
      expect(launcher.isProcess()).to.be.ok
    })
    it('should launch if not a process and started', function(){
      stub(launcher, 'isProcess').returns(false)
      stub(launcher, 'launch')
      launcher.start()
      expect(launcher.launch.called).to.be.ok
    })
    it('substitutes variables', function(done){
      settings.command = 'echo <url> <port>'
      launcher.start()
      launcher.on('processExit', function(code, stdout) {
        expect(stdout).to.match(/http:\/\/blah.com\/([0-9]+) 7357(\r\n|\n)/)
        done()
      })
    })
    it('executes setup', function(done){
      settings.setup = function(_config){
        assert.strictEqual(_config, config)
        done()
      }
      launcher.start()
    })
    it('returns exit code, stdout and stderr on processExit', function(done){
      launcher.start()
      launcher.on('processExit', function(code, stdout){
        assert.equal(code, 0)
        assert.equal(stdout, 'hello' + EOL)
        done()
      })
    })
    it('returns stderr on processExit', function(done){
      settings.command = 'node -e "console.error(\'hello\')"'
      launcher.start()
      launcher.on('processExit', function(code, stdout, stderr){
        assert.equal(stderr, 'hello\n')
        done()
      })
    })
    it('returns commandLine', function(){
      assert.equal(launcher.commandLine(), '"echo hello"')
    })
    it('copies the current environment', function(done) {
      var originalEnv = process.env;
      process.env.TESTEM_USER_CONFIG = 'copied'

      settings.command = 'node -e "console.log(process.env.TESTEM_USER_CONFIG)"'
      config = new Config()
      launcher.start()
      launcher.on('processExit', function(code, stdout){
        assert.equal(code, 0)
        assert.equal(stdout, 'copied\n')
        process.env = originalEnv;
        done()
      })
    })
  })

  describe('via exe', function(){

    var echoArgs = 'console.log(process.argv.slice(1).join(\' \'))'

    it('should launch and also kill it', function(done){
      settings = {exe: 'node', args: ['-e', echoArgs, 'hello']}
      config = new Config(null, {port: '7357', url: 'http://blah.com/'})
      launcher = new Launcher('say hello', settings, config)
      launcher.launch()
      var data = ''
      launcher.process.on('exit', function(){
        expect(data).to.match(/hello http:\/\/blah.com\/[0-9]+(\r\n|\n)/)
        done()
      })
      launcher.process.stdout.on('data', function(chunk){
        data += String(chunk)
      })
    })
    it('should substitute variables for args', function(done){
      settings = {exe: 'node', args: ['-e', echoArgs, '<port>', '<url>']}
      config = new Config(null, {port: '7357', url: 'http://blah.com/'})
      launcher = new Launcher('say url', settings, config)
      launcher.launch()
      var data = ''

      launcher.process.on('exit', function(){
        expect(data).to.match(/7357 http:\/\/blah.com\/[0-9]+ http:\/\/blah.com\/[0-9]+(\r\n|\n)/)
        done()
      })
      launcher.process.stdout.on('data', function(chunk){
        data += String(chunk)
      })
    })
    it('calls args as function with config', function(done){
      settings = {exe: 'node'}
      settings.args = function(_config){
        assert.strictEqual(_config, config)
        return ['-e', echoArgs, 'hello']
      }
      config = new Config()
      launcher = new Launcher('say hello', settings, config)
      launcher.launch()

      var data = ''
      launcher.process.on('exit', function(){
        expect(data).to.eq('hello\n')
        done()
      })
      launcher.process.stdout.on('data', function(chunk){
        data += String(chunk)
      })
    })

    it('returns exit code and stdout on processExit', function(done){
      launcher.launch()
      launcher.on('processExit', function(code, stdout){
        assert.equal(code, 0)
        assert.equal(stdout, 'hello\n')
        done()
      })
    })

    it('returns commandLine', function(){
      assert.equal(launcher.commandLine(), '"node -e console.log(process.argv.slice(1).join(\' \')) hello"')
    })

    it('copies the current environment', function(done) {
      var originalEnv = process.env;
      process.env.TESTEM_USER_CONFIG = 'copied'

      settings = {exe: 'node', args: ['-e', 'console.log(process.env.TESTEM_USER_CONFIG)']}
      config = new Config()
      launcher = new Launcher('say hello', settings, config)
      launcher.launch()
      launcher.on('processExit', function(code, stdout){
        assert.equal(code, 0)
        assert.equal(stdout, 'copied\n')

        process.env = originalEnv;
        done()
      })
    })

  })
})
