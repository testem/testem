var Server = require('../lib/server')
var Config = require('../lib/config')
var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var request = require('request')
var cheerio = require('cheerio')
var fs = require('fs')
var expect = require('chai').expect
var http = require('http')
var https = require('https')

var isWin = /^win/.test(process.platform)

describe('Server', !isWin ? function(){
  var baseUrl, server, config
  var port = 63571

  describe('http', function() {
    var runners, socketClient
    before(function(done){
      config = new Config('dev', {
        port: port,
        src_files: [
          'web/hello.js',
          {src:'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar']}
        ],
        cwd: 'tests',
        proxies: {
          '/api1': {
            target: 'http://localhost:13372'
          },
          '/api2': {
            target: 'https://localhost:13373',
            secure: false
          }
        }
      })
      baseUrl = 'http://localhost:' + port + '/'
      runners = new Backbone.Collection()

      server = new Server(config)
      server.start()
      server.server.addListener('connection', function(stream){
        stream.setTimeout(100) // don't tolerate idleness in tests
      })
      server.once('server-start', function(){
        done()
      })
    })
    after(function(done){
      server.stop(function(){
        done()
      })
    })

    it('gets the home page', function(done){
      request(baseUrl, done)
    })

    it('gets scripts for the home page', function(done){
      request(baseUrl, function(err, req, text){
        var $ = cheerio.load(text)
        var srcs = $('script').map(function() { return $(this).attr('src') }).get()
        expect(srcs).to.deep.equal([
          '/testem/jasmine.js',
          '/testem.js',
          '/testem/jasmine-html.js',
          'web/hello.js',
          'web/hello_tst.js'
        ])
        done()
      })
    })

    it('gets testem.js', function(done){
      request(baseUrl + '/testem.js', done)
    })

    it('gets src file', function(done){
      assertUrlReturnsFileContents(baseUrl + 'web/hello.js', 'tests/web/hello.js', done)
    })

    it('gets bundled files', function(done){
      assertUrlReturnsFileContents(baseUrl + 'testem/jasmine.js', 'public/testem/jasmine.js', done)
    })

    it('serves custom test page', function(done){
      config.set('test_page', 'web/tests.html')
      assertUrlReturnsFileContents(baseUrl, 'tests/web/tests.html', done)
    })

    it('renders custom test page as template', function(done){
      config.set('test_page', 'web/tests_template.mustache')
      request(baseUrl, function(err, req, text){
        expect(text).to.equal(
          [
          '<!doctype html>',
          '<html>',
          '<head>',
          '    <script src="web/hello.js"></script>',
          '    <script src="web/hello_tst.js" data-foo="true" data-bar></script>',
          '</head>',
          ''
          ].join('\n'))
        done()
      })
    })

    it('gets a file using a POST request', function(done) {
      request.post(baseUrl + 'web/hello.js', function(err, req, text) {
        expect(text).to.equal(fs.readFileSync('tests/web/hello.js').toString())
        done()
      })
    })

    function assertUrlReturnsFileContents(url, file, done){
      request(url, function(err, req, text){
        expect(text).to.equal(fs.readFileSync(file).toString())
        done()
      })
    }

    it('lists directories', function(done){
        request(baseUrl + 'data', function(err, req, text){
            expect(text).to.match(/<a href=\"blah.txt\">blah.txt<\/a>/)
            done()
        })
    })


    describe('proxies', function() {
      var api1, api2

      beforeEach(function(done) {
        api1 = http.createServer(function (req, res) {
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end('API');
        })
        var options = {
          key: fs.readFileSync('tests/fixtures/certs/localhost.key'),
          cert: fs.readFileSync('tests/fixtures/certs/localhost.cert')
        };
        api2 = https.createServer(options, function (req, res) {
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end('API - 2');
        })

        api1.listen(13372, function() {
          api2.listen(13373, function() {
            done()
          })
        })
      })

      afterEach(function(done) {
        api1.close(function() {
          api2.close(function() {
            done()
          })
        })
      })

      it('proxies get request to api1', function(done) {
        request.get(baseUrl + 'api1/hello', function(err, req, text) {
          expect(text).to.equal('API')
          done()
        })
      })

      it('proxies get request to api2', function(done) {
        request.get(baseUrl + 'api2/hello', function(err, req, text) {
          expect(text).to.equal('API - 2')
          done()
        })
      })

      it('proxies post request to api1', function(done) {
        request.post(baseUrl + 'api1/hello', function(err, req, text) {
          expect(text).to.equal('API')
          done()
        })
      })
    })
  })

  describe('https', function() {
    before(function(done){
      config = new Config('dev', {
        port: port,
        key: 'tests/fixtures/certs/localhost.key',
        cert: 'tests/fixtures/certs/localhost.cert',
        src_files: [
          'web/hello.js',
          {src:'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar']}
        ],
        cwd: 'tests'
      })
      baseUrl = 'https://localhost:' + port + '/'

      server = new Server(config)
      server.once('server-start', function(){
        done()
      })
      server.start()
    })
    after(function(done){
      server.stop(function(){
        done()
      })
    })

    it('gets the home page', function(done){
      request({ url: baseUrl, strictSSL: false }, done)
    })
  })

}: function() {
  xit('TODO: Fix and re-enable for windows')
})
