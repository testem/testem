const Server = require('../lib/server');
const Config = require('../lib/config');
const path = require('path');
const request = require('@cypress/request');
const cheerio = require('cheerio');
const fs = require('fs');
const expect = require('chai').expect;
const http = require('http');
const https = require('https');
const ws = require('ws');
const os = require('os');

describe('Server', function() {
  this.timeout(10000);

  let baseUrl, server, config;
  let port = 63571;

  describe('http', function() {
    before(function(done) {
      config = new Config('dev', {
        port: port,
        socket_heartbeat_timeout: 6,
        middleware: [middleware],
        src_files: [
          'web/hello.js',
          { src: 'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar'] }
        ],
        routes: {
          '/direct-test': 'web/direct',
          '/fallback-test': ['web/direct', 'web/fallback']
        },
        cwd: 'tests',
        proxies: {
          '/api1': {
            target: 'http://localhost:13372'
          },
          '/api2': {
            target: 'https://localhost:13373',
            secure: false
          },
          '/api3': {
            target: 'http://localhost:13374',
            onlyContentTypes: ['json']
          },
          '/api4': {
            target: 'http://localhost:13375'
          },
          '/wsapi': {
            target: 'ws://localhost:13376',
            ws: true
          },
          '/wssapi': {
            target: 'wss://localhost:13377',
            ws: true,
            secure: false
          },
          '/api-error': {
            target: 'http://localhost:13378'
          },
        }
      });
      baseUrl = 'http://localhost:' + port + '/';

      server = new Server(config);
      server.start();
      server.once('server-start', function() {
        done();
      });
    });
    after(function() {
      return server.stop();
    });

    describe('routing and redirects', function() {
      it('redirects to an id', function(done) {
        request(baseUrl, { followRedirect: false }, function(err, res) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(302);
          expect(res.headers.location).to.match(/^\/[0-9]+$/);
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('serves the homepage after redirect', function(done) {
        request(baseUrl, { followRedirect: true }, function(err, res) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(200);
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('serves the homepage for a numeric browser id directly', function(done) {
        request(baseUrl + '1234', function(err, res) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(200);
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('serves the homepage for tap id (-1) directly', function(done) {
        request(baseUrl + '-1', function(err, res) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(200);
          expectMiddlewareHeaders(res);
          done();
        });
      });
    });

    describe('test page rendering', function() {
      it('gets scripts for the home page', function(done) {
        request(baseUrl, function(err, res, text) {
          let $ = cheerio.load(text);
          let srcs = $('script').map(function() { return $(this).attr('src'); }).get();
          expect(srcs).to.deep.equal([
            '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine.js',
            '/testem.js',
            '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine-html.js',
            'web' + path.sep + 'hello.js',
            'web' + path.sep + 'hello_tst.js'
          ]);
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('serves custom test page', function(done) {
        config.set('test_page', 'web/tests.html');
        assertUrlReturnsFileContents(baseUrl, 'tests/web/tests.html', done);
      });

      it('renders custom test page as template', function(done) {
        config.set('test_page', 'web/tests_template.mustache');
        request(baseUrl, function(err, res, text) {
          expect(text).to.equal(
            [
              '<!doctype html>',
              '<html>',
              '<head>',
              '    <script src="web/hello.js"></script>',
              '    <script src="web/hello_tst.js" data-foo="true" data-bar></script>',
              '</head>',
              ''
            ].join(os.EOL));
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('renders the first test page by default when multiple are provided', function(done) {
        config.set('test_page', ['web/tests_template.mustache', 'web/tests.html']);
        request(baseUrl, function(err, res, text) {
          expect(text).to.equal(
            [
              '<!doctype html>',
              '<html>',
              '<head>',
              '    <script src="web/hello.js"></script>',
              '    <script src="web/hello_tst.js" data-foo="true" data-bar></script>',
              '</head>',
              ''
            ].join(os.EOL));
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('URL-encodes test_page path that starts with a slash', function(done) {
        config.set('test_page', '/my/custom-page.html');
        request(baseUrl + '1234', { followRedirect: false }, function(err, res) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(302);
          expect(res.headers.location).to.include('%2F');
          done();
        });
      });
    });

    describe('testem.js', function() {
      it('gets testem.js', function(done) {
        request(baseUrl + '/testem.js', done);
      });

      it('gets testem.js with expected content', function(done) {
        request(baseUrl + 'testem.js', function(err, res, text) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(200);
          expect(res.headers['content-type']).to.match(/javascript/);
          expect(text).to.include('TestemConfig');
          expect(text).to.include('testem_client.js');
          done();
        });
      });
    });

    describe('static file serving', function() {
      it('gets src file', function(done) {
        assertUrlReturnsFileContents(baseUrl + 'web/hello.js', 'tests/web/hello.js', done);
      });

      it('gets bundled files', function(done) {
        assertUrlReturnsFileContents(baseUrl + 'testem/connection.html', 'public/testem/connection.html', done);
      });

      it('gets a file using a POST request', function(done) {
        request.post(baseUrl + 'web/hello.js', function(err, res, text) {
          expect(text).to.equal(fs.readFileSync('tests/web/hello.js').toString());
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('lists directories', function(done) {
        request(baseUrl + 'data', function(err, res, text) {
          expect(text).to.match(/<a href="blah.txt">blah.txt<\/a>/);
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('returns 404 for a non-existent file', function(done) {
        request(baseUrl + 'web/does-not-exist.js', function(err, res, text) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(404);
          expect(text).to.match(/Not found/);
          done();
        });
      });

      it('serves local content with browser ids', function(done) {
        assertUrlReturnsFileContents(baseUrl + '1234' + '/web/hello.js', 'tests/web/hello.js', done);
      });

      it('serves local content with tap id', function(done) {
        assertUrlReturnsFileContents(baseUrl + '-1' + '/web/hello.js', 'tests/web/hello.js', done);
      });

      it('accepts other http methods', function(done) {
        request.del(baseUrl + '-1' + '/web/hello.js', function(err, res) {
          expect(err).to.be.null();
          expect(res.statusCode).to.eq(200);
          expectMiddlewareHeaders(res);
          done();
        });
      });
    });

    describe('socket.io configuration', function() {
      it('sets heartbeat_timeout on socket.io server', function() {
        expect(server.io.eio.opts.pingTimeout).to.eq(6000);
      });
    });

    describe('route config', function() {
      it('routes server paths to local paths', function(done) {
        assertUrlReturnsFileContents(baseUrl + 'direct-test/test.js', 'tests/web/direct/test.js', done);
      });

      it('allows fallback paths', function(done) {
        let expectedCallbacks = 2;
        let cb = function() {
          if (--expectedCallbacks === 0) {
            done();
          }
        };
        assertUrlReturnsFileContents(baseUrl + 'fallback-test/test.js', 'tests/web/direct/test.js', cb);
        assertUrlReturnsFileContents(baseUrl + 'fallback-test/test2.js', 'tests/web/fallback/test2.js', cb);
      });
    });

    describe('proxies', function() {
      let api1, api2, api3, api4, wsapi_server, wssapi_server;

      beforeEach(function(done) {
        api1 = http.createServer(function(req, res) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('API');
        });
        let options = {
          key: fs.readFileSync('tests/fixtures/certs/localhost.key'),
          cert: fs.readFileSync('tests/fixtures/certs/localhost.cert')
        };
        api2 = https.createServer(options, function(req, res) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('API - 2');
        });
        api3 = http.createServer(function(req, res) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ API: 3 }));
        });

        api4 = http.createServer(function(req, res) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          req.on('data', function(data) {
            res.write(data);
          });
          req.on('end', function() {
            res.end();
          });
        });

        wsapi_server = http.createServer();
        wssapi_server = https.createServer(options);

        api1.listen(13372, function() {
          api2.listen(13373, function() {
            api3.listen(13374, function() {
              api4.listen(13375, function() {
                wsapi_server.listen(13376, function() {
                  wssapi_server.listen(13377, function() {
                    done();
                  });
                });
              });
            });
          });
        });
      });

      afterEach(function(done) {
        api1.close(function() {
          api2.close(function() {
            api3.close(function() {
              api4.close(function() {
                wsapi_server.close(function() {
                  wssapi_server.close(function() {
                    done();
                  });
                });
              });
            });
          });
        });
      });

      it('proxies get request to api1', function(done) {
        request.get(baseUrl + 'api1/hello', function(err, res, text) {
          expect(text).to.equal('API');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies get request with deep subpath to api1', function(done) {
        request.get(baseUrl + 'api1/foo/bar/baz', function(err, res, text) {
          expect(text).to.equal('API');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies get request to api2', function(done) {
        let options = {
          url: baseUrl + 'api2/hello',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        request.get(options, function(err, res, text) {
          expect(text).to.equal('API - 2');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies post request to api1', function(done) {
        let options = {
          url: baseUrl + 'api1/hello',
          headers: {
            Accept: 'application/json'
          }
        };
        request.post(options, function(err, res, text) {
          expect(text).to.equal('API');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies get request to api3', function(done) {
        let options = {
          url: baseUrl + 'api3/test',
          headers: {
            Accept: 'application/json'
          }
        };
        request.get(options, function(err, res, text) {
          expect(text).to.equal('{"API":3}');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies post request to api3', function(done) {
        let options = {
          url: baseUrl + 'api3/test',
          headers: {
            Accept: 'application/json'
          }
        };
        request.post(options, function(err, res, text) {
          expect(text).to.equal('{"API":3}');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies post request to api4', function(done) {
        let options = {
          url: baseUrl + 'api4/test',
          headers: {
            Accept: 'application/json'
          },
          body: '{test: \'some value\'}'
        };
        request.post(options, function(err, res, text) {
          if (err) {
            return done(err);
          }
          expect(text).to.equal('{test: \'some value\'}');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies get html request to api3', function(done) {
        let options = {
          url: baseUrl + 'api3/test',
          headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          }
        };
        request.get(options, function(err, res, text) {
          expect(text).to.equal('Not found: /api3/test');
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('returns an error when a requst can not be proxied', function(done) {
        let options = {
          url: baseUrl + 'api-error/test'
        };
        request.get(options, function(err, res, text) {
          expect(res.statusCode).to.eq(500);
          expect(text).to.match(/ECONNREFUSED/);
          expectMiddlewareHeaders(res);
          done();
        });
      });

      it('proxies WebSocket to wsapi (ws → ws)', function(done) {
        const wsMsg = 'Hello over wsapi: 341bcb0e-db49-468d-924b-135645cafb90';
        const wsPingMsg = 'Ping over wsapi: bb161729-414d-4861-8090-db3bbbe728d3';
        const wsapi = new ws.Server({ server: wsapi_server });
        wsapi.on('connection', function(socket) {
          socket.on('message', function(message) {
            expect(message.toString()).to.equal(wsMsg);
            done();
          });
          socket.on('ping', function(data) {
            expect(data.toString()).to.equal(wsPingMsg);
          }); // + autoPong by server
        });
        const wsClient = new ws.WebSocket('ws://localhost:' + port + '/wsapi');

        wsClient.on('open', function() {
          wsClient.on('pong', function(data) {
            expect(data.toString()).to.equal(wsPingMsg);
            wsClient.send(wsMsg, { binary: false }, function() {
              wsClient.close();
            });
          });
          wsClient.ping(wsPingMsg);
        });
      });

      it('proxies WebSocket to wssapi (ws → wss)', function(done) {
        const wssMsg = 'Hello over wssapi: 5a120d3f-be82-408f-99ec-be92e7cd8ab7';
        const wssPingMsg = 'Ping over wssapi: 19c0c2eb-52a3-4be3-83d1-f93eb35479ca';
        const wssapi = new ws.Server({ server: wssapi_server });
        wssapi.on('connection', function(socket) {
          socket.on('message', function(message) {
            expect(message.toString()).to.equal(wssMsg);
            done();
          });
          socket.on('ping', function(data) {
            expect(data.toString()).to.equal(wssPingMsg);
          }); // + autoPong by server
        });
        const wssClient = new ws.WebSocket('ws://localhost:' + port + '/wssapi'); // ws → wss !
        wssClient.on('open', function() {
          wssClient.on('pong', function(data) {
            expect(data.toString()).to.equal(wssPingMsg);
            wssClient.send(wssMsg, { binary: false }, function() {
              wssClient.close();
            });
          });
          wssClient.ping(wssPingMsg);
        });
      });
    });
  });

  describe('a wildcard proxy', function() {
    let api;

    before(function(done) {
      config = new Config('dev', {
        port: port,
        cwd: 'tests',
        proxies: {
          '/*/': {
            target: 'http://localhost:13372',
          }
        }
      });
      baseUrl = 'http://localhost:' + port + '/';

      api = http.createServer(function(req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('proxied');
      });

      server = new Server(config);
      server.start();

      server.once('server-start', function() {
        api.listen(13372, function() {
          done();
        });
      });
    });
    after(function() {
      return server.stop().then(() => new Promise(resolve => api.close(resolve)));
    });

    it('does not proxy testem files', function(done) {
      request.get(baseUrl + 'foo/bar', function(err, res, text) {
        expect(text).to.equal('proxied');

        request.get(baseUrl + 'testem/connection.html', function(err, res, text) {
          expect(text).to.not.equal('proxied');
          done();
        });
      });
    });
  });

  describe('https', function() {
    before(function(done) {
      config = new Config('dev', {
        port: port,
        key: 'tests/fixtures/certs/localhost.key',
        cert: 'tests/fixtures/certs/localhost.cert',
        src_files: [
          'web/hello.js',
          { src: 'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar'] }
        ],
        cwd: 'tests'
      });
      baseUrl = 'https://localhost:' + port + '/';

      server = new Server(config);
      server.once('server-start', function() {
        done();
      });
      server.start();
    });
    after(function() {
      return server.stop();
    });

    it('gets the home page', function(done) {
      request({ url: baseUrl, strictSSL: false }, done);
    });
  });

  describe('auto port assignment', function() {
    before(function(done) {
      config = new Config('dev', {
        port: 0,
        cwd: 'tests'
      });
      server = new Server(config);
      server.once('server-start', function() {
        done();
      });
      server.start();
    });
    after(function() {
      return server.stop();
    });

    it('updates the config with the actual port', function() {
      expect(config.get('port')).not.to.eq(0);
      expect(config.get('port')).to.eq(server.server.address().port);
    });
  });

  describe('unsafe directory handling', function() {
    before(function(done) {
      // Intentionally construct a path with forward slashes so that we can guard
      // against a regression on this issue: https://github.com/testem/testem/issues/1286
      var forwardSlashCwd = __dirname.split(path.sep).join('/');
      config = new Config('dev', {
        port: port,
        unsafe_file_serving: false,
        socket_heartbeat_timeout: 6,
        serve_files: [
          'web/hello.js',
          '../public/.eslintrc.js'
        ],
        cwd: forwardSlashCwd
      });
      baseUrl = 'http://localhost:' + port + '/';

      server = new Server(config);
      server.start();
      server.once('server-start', function() {
        done();
      });
    });
    after(function() {
      return server.stop();
    });

    it('handles a request for safe content', function(done) {
      request(baseUrl + 'web/hello.js', function(err, res) {
        expect(res.statusCode).to.eq(200);
        done();
      });
    });

    it('rejects a request for unsafe content', function(done) {
      request(baseUrl + '../public/.eslintrc.js', function(err, res) {
        expect(res.statusCode).to.eq(403);
        done();
      });
    });
  });

  describe('routes["/"] config', function() {
    let routesServer, routesBaseUrl;

    before(function(done) {
      const routesConfig = new Config('dev', {
        port: port,
        cwd: 'tests',
        routes: { '/': 'web/direct' }
      });
      routesBaseUrl = 'http://localhost:' + port + '/';
      routesServer = new Server(routesConfig);
      routesServer.start();
      routesServer.once('server-start', done);
    });

    after(function() {
      return routesServer.stop();
    });

    it('serves static file instead of the default runner when routes["/"] is set', function(done) {
      request(routesBaseUrl + '1234', function(err, res, text) {
        expect(err).to.be.null();
        expect(res.statusCode).to.eq(200);
        expect(text).to.include('test.js');
        done();
      });
    });
  });

  describe('server start error', function() {
    it('rejects and emits server-error when port is already in use', function(done) {
      const occupiedConfig = new Config('dev', { port: 0, cwd: 'tests' });
      const occupiedServer = new Server(occupiedConfig);

      occupiedServer.start().then(function() {
        const occupiedPort = occupiedConfig.get('port');
        const conflictConfig = new Config('dev', { port: occupiedPort, cwd: 'tests' });
        const conflictServer = new Server(conflictConfig);
        let errorEmitted = false;

        conflictServer.on('server-error', function() {
          errorEmitted = true;
        });

        conflictServer.start().then(function() {
          return occupiedServer.stop().then(function() {
            done(new Error('Expected start() to reject on port conflict'));
          });
        }).catch(function(err) {
          expect(err.code).to.eq('EADDRINUSE');
          expect(errorEmitted).to.eq(true);
          return occupiedServer.stop();
        }).then(function() {
          done();
        }).catch(done);
      });
    });
  });

  describe('stop() idempotency', function() {
    let stopServer;

    before(function() {
      const stopConfig = new Config('dev', { port: 0, cwd: 'tests' });
      stopServer = new Server(stopConfig);
      return stopServer.start();
    });

    it('returns a resolved promise when stop() is called a second time', function() {
      return stopServer.stop().then(function() {
        return stopServer.stop();
      });
    });
  });
});

function middleware(app) {
  app.use((_, res, next) => {
    res.setHeader('x-testem-middleware', 'success');
    next();
  });
}

function expectMiddlewareHeaders(res) {
  expect(res.headers['x-testem-middleware']).to.eq('success');
}

function assertUrlReturnsFileContents(url, file, done) {
  request(url, function(err, res, text) {
    expect(err).to.be.null();
    expect(res.statusCode).to.eq(200);
    expectMiddlewareHeaders(res);
    expect(text).to.equal(fs.readFileSync(file).toString());
    done();
  });
}
