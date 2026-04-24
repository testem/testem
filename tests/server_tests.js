const Server = require('../lib/server');
const Config = require('../lib/config');
const path = require('path');
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
  let client;

  before(async function() {
    const m = await import('./helpers/http_client.mjs');
    client = m.client;
  });

  describe('http', function() {
    before(function(done) {
      config = new Config('dev', {
        port: port,
        socket_heartbeat_timeout: 6,
        middleware: [middleware],
        src_files: [
          'web/hello.js',
          { src: 'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar'] },
        ],
        routes: {
          '/direct-test': 'web/direct',
          '/fallback-test': ['web/direct', 'web/fallback'],
        },
        cwd: 'tests',
        proxies: {
          '/api1': {
            target: 'http://localhost:13372',
          },
          '/api2': {
            target: 'https://localhost:13373',
            secure: false,
          },
          '/api3': {
            target: 'http://localhost:13374',
            onlyContentTypes: ['json'],
          },
          '/api4': {
            target: 'http://localhost:13375',
          },
          '/wsapi': {
            target: 'ws://localhost:13376',
            ws: true,
          },
          '/wssapi': {
            target: 'wss://localhost:13377',
            ws: true,
            secure: false,
          },
          '/api-error': {
            target: 'http://localhost:13378',
          },
        },
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
        client
          .get(baseUrl, { followRedirect: false })
          .then(function(res) {
            expect(res.statusCode).to.eq(302);
            expect(res.headers.location).to.match(/^\/[0-9]+$/);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('serves the homepage after redirect', function(done) {
        client
          .get(baseUrl, { followRedirect: true })
          .then(function(res) {
            expect(res.statusCode).to.eq(200);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('serves the homepage for a numeric browser id directly', function(done) {
        client
          .get(baseUrl + '1234')
          .then(function(res) {
            expect(res.statusCode).to.eq(200);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('serves the homepage for tap id (-1) directly', function(done) {
        client
          .get(baseUrl + '-1')
          .then(function(res) {
            expect(res.statusCode).to.eq(200);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });
    });

    describe('test page rendering', function() {
      it('gets scripts for the home page', function(done) {
        client
          .get(baseUrl)
          .then(function(res) {
            const text = bodyText(res);
            let $ = cheerio.load(text);
            let srcs = $('script')
              .map(function() {
                return $(this).attr('src');
              })
              .get();
            expect(srcs).to.deep.equal([
              '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine.js',
              '/testem.js',
              '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine-html.js',
              'web' + path.sep + 'hello.js',
              'web' + path.sep + 'hello_tst.js',
            ]);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('serves custom test page', function(done) {
        config.set('test_page', 'web/tests.html');
        assertUrlReturnsFileContents(baseUrl, 'tests/web/tests.html', done);
      });

      it('renders custom test page as template', function(done) {
        config.set('test_page', 'web/tests_template.mustache');
        client
          .get(baseUrl)
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal(
              [
                '<!doctype html>',
                '<html>',
                '<head>',
                '    <script src="web/hello.js"></script>',
                '    <script src="web/hello_tst.js" data-foo="true" data-bar></script>',
                '</head>',
                '',
              ].join(os.EOL),
            );
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('renders the first test page by default when multiple are provided', function(done) {
        config.set('test_page', [
          'web/tests_template.mustache',
          'web/tests.html',
        ]);
        client
          .get(baseUrl)
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal(
              [
                '<!doctype html>',
                '<html>',
                '<head>',
                '    <script src="web/hello.js"></script>',
                '    <script src="web/hello_tst.js" data-foo="true" data-bar></script>',
                '</head>',
                '',
              ].join(os.EOL),
            );
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('URL-encodes test_page path that starts with a slash', function(done) {
        config.set('test_page', '/my/custom-page.html');
        client
          .get(baseUrl + '1234', { followRedirect: false })
          .then(function(res) {
            expect(res.statusCode).to.eq(302);
            expect(res.headers.location).to.include('%2F');
            done();
          })
          .catch(done);
      });
    });

    describe('testem.js', function() {
      it('gets testem.js', function(done) {
        client
          .get(baseUrl + '/testem.js')
          .then(function(res) {
            if (res.statusCode >= 400) {
              return done(new Error('expected success status, got ' + res.statusCode));
            }
            done();
          })
          .catch(done);
      });

      it('gets testem.js with expected content', function(done) {
        client
          .get(baseUrl + 'testem.js')
          .then(function(res) {
            const text = bodyText(res);
            expect(res.statusCode).to.eq(200);
            expect(res.headers['content-type']).to.match(/javascript/);
            expect(text).to.include('TestemConfig');
            expect(text).to.include('testem_client.js');
            done();
          })
          .catch(done);
      });
    });

    describe('static file serving', function() {
      it('gets src file', function(done) {
        assertUrlReturnsFileContents(
          baseUrl + 'web/hello.js',
          'tests/web/hello.js',
          done,
        );
      });

      it('gets bundled files', function(done) {
        assertUrlReturnsFileContents(
          baseUrl + 'testem/connection.html',
          'public/testem/connection.html',
          done,
        );
      });

      it('gets a file using a POST request', function(done) {
        client
          .post(baseUrl + 'web/hello.js')
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal(
              fs.readFileSync('tests/web/hello.js').toString(),
            );
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('lists directories', function(done) {
        client
          .get(baseUrl + 'data')
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.match(/<a href="blah.txt">blah.txt<\/a>/);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('returns 404 for a non-existent file', function(done) {
        client
          .get(baseUrl + 'web/does-not-exist.js')
          .then(function(res) {
            const text = bodyText(res);
            expect(res.statusCode).to.eq(404);
            expect(text).to.match(/Not found/);
            done();
          })
          .catch(done);
      });

      it('serves local content with browser ids', function(done) {
        assertUrlReturnsFileContents(
          baseUrl + '1234' + '/web/hello.js',
          'tests/web/hello.js',
          done,
        );
      });

      it('serves local content with tap id', function(done) {
        assertUrlReturnsFileContents(
          baseUrl + '-1' + '/web/hello.js',
          'tests/web/hello.js',
          done,
        );
      });

      it('serves local content with any negative numeric id', function(done) {
        assertUrlReturnsFileContents(
          baseUrl + '-5' + '/web/hello.js',
          'tests/web/hello.js',
          done,
        );
      });

      it('serves a non-numeric single-segment path as a static file', function(done) {
        // A single slug like /data should fall through the numeric /:id guard
        // and be served via the /*file catch-all route as a directory listing.
        client
          .get(baseUrl + 'data')
          .then(function(res) {
            expect(res.statusCode).to.eq(200);
            done();
          })
          .catch(done);
      });

      it('accepts other http methods', function(done) {
        client
          .delete(baseUrl + '-1' + '/web/hello.js')
          .then(function(res) {
            expect(res.statusCode).to.eq(200);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });
    });

    describe('socket.io configuration', function() {
      it('sets heartbeat_timeout on socket.io server', function() {
        expect(server.io.eio.opts.pingTimeout).to.eq(6000);
      });
    });

    describe('route config', function() {
      it('routes server paths to local paths', function(done) {
        assertUrlReturnsFileContents(
          baseUrl + 'direct-test/test.js',
          'tests/web/direct/test.js',
          done,
        );
      });

      it('allows fallback paths', function(done) {
        let expectedCallbacks = 2;
        let cb = function() {
          if (--expectedCallbacks === 0) {
            done();
          }
        };
        assertUrlReturnsFileContents(
          baseUrl + 'fallback-test/test.js',
          'tests/web/direct/test.js',
          cb,
        );
        assertUrlReturnsFileContents(
          baseUrl + 'fallback-test/test2.js',
          'tests/web/fallback/test2.js',
          cb,
        );
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
          cert: fs.readFileSync('tests/fixtures/certs/localhost.cert'),
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
        client
          .get(baseUrl + 'api1/hello')
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('API');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies get request with deep subpath to api1', function(done) {
        client
          .get(baseUrl + 'api1/foo/bar/baz')
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('API');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies get request to api2', function(done) {
        const url = baseUrl + 'api2/hello';
        const headers = {
          'Content-Type': 'application/json',
        };
        client
          .get(url, { headers: headers })
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('API - 2');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies post request to api1', function(done) {
        const url = baseUrl + 'api1/hello';
        const headers = {
          Accept: 'application/json',
        };
        client
          .post(url, { headers: headers })
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('API');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies get request to api3', function(done) {
        const url = baseUrl + 'api3/test';
        const headers = {
          Accept: 'application/json',
        };
        client
          .get(url, { headers: headers })
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('{"API":3}');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies post request to api3', function(done) {
        const url = baseUrl + 'api3/test';
        const headers = {
          Accept: 'application/json',
        };
        client
          .post(url, { headers: headers })
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('{"API":3}');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies post request to api4', function(done) {
        const url = baseUrl + 'api4/test';
        const headers = {
          Accept: 'application/json',
        };
        const body = '{test: \'some value\'}';
        client
          .post(url, { headers: headers, body: body })
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('{test: \'some value\'}');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies get html request to api3', function(done) {
        const url = baseUrl + 'api3/test';
        const headers = {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        };
        client
          .get(url, { headers: headers })
          .then(function(res) {
            const text = bodyText(res);
            expect(text).to.equal('Not found: /api3/test');
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('returns an error when a requst can not be proxied', function(done) {
        const url = baseUrl + 'api-error/test';
        client
          .get(url)
          .then(function(res) {
            const text = bodyText(res);
            expect(res.statusCode).to.eq(500);
            expect(text).to.match(/ECONNREFUSED/);
            expectMiddlewareHeaders(res);
            done();
          })
          .catch(done);
      });

      it('proxies WebSocket to wsapi (ws → ws)', function(done) {
        const wsMsg = 'Hello over wsapi: 341bcb0e-db49-468d-924b-135645cafb90';
        const wsPingMsg =
          'Ping over wsapi: bb161729-414d-4861-8090-db3bbbe728d3';
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
        const wssMsg =
          'Hello over wssapi: 5a120d3f-be82-408f-99ec-be92e7cd8ab7';
        const wssPingMsg =
          'Ping over wssapi: 19c0c2eb-52a3-4be3-83d1-f93eb35479ca';
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
        const wssClient = new ws.WebSocket(
          'ws://localhost:' + port + '/wssapi',
        ); // ws → wss !
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
          },
        },
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
      return server
        .stop()
        .then(() => new Promise((resolve) => api.close(resolve)));
    });

    it('does not proxy testem files', function(done) {
      client
        .get(baseUrl + 'foo/bar')
        .then(function(res) {
          const text = bodyText(res);
          expect(text).to.equal('proxied');
          return client.get(baseUrl + 'testem/connection.html');
        })
        .then(function(res) {
          const text = bodyText(res);
          expect(text).to.not.equal('proxied');
          done();
        })
        .catch(done);
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
          { src: 'web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar'] },
        ],
        cwd: 'tests',
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
      client
        .get(baseUrl)
        .then(function(res) {
          if (res.statusCode >= 400) {
            return done(
              new Error('expected success status, got ' + res.statusCode),
            );
          }
          done();
        })
        .catch(done);
    });
  });

  describe('https with pfx certificate', function() {
    before(function(done) {
      config = new Config('dev', {
        port: port,
        pfx: 'tests/fixtures/certs/localhost.pfx',
        cwd: 'tests',
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

    it('gets the home page over https via pfx certificate', function(done) {
      client
        .get(baseUrl)
        .then(function(res) {
          if (res.statusCode >= 400) {
            return done(
              new Error('expected success status, got ' + res.statusCode),
            );
          }
          done();
        })
        .catch(done);
    });
  });

  describe('auto port assignment', function() {
    before(function(done) {
      config = new Config('dev', {
        port: 0,
        cwd: 'tests',
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
        serve_files: ['web/hello.js', '../public/.eslintrc.js'],
        cwd: forwardSlashCwd,
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
      client
        .get(baseUrl + 'web/hello.js')
        .then(function(res) {
          expect(res.statusCode).to.eq(200);
          done();
        })
        .catch(done);
    });

    it('rejects a request for unsafe content', function(done) {
      client
        .get(baseUrl + '../public/.eslintrc.js')
        .then(function(res) {
          expect(res.statusCode).to.eq(403);
          done();
        })
        .catch(done);
    });
  });

  describe('routes["/"] config', function() {
    let routesServer, routesBaseUrl;

    before(function(done) {
      const routesConfig = new Config('dev', {
        port: port,
        cwd: 'tests',
        routes: { '/': 'web/direct' },
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
      client
        .get(routesBaseUrl + '1234')
        .then(function(res) {
          const text = bodyText(res);
          expect(res.statusCode).to.eq(200);
          expect(text).to.include('test.js');
          done();
        })
        .catch(done);
    });
  });

  describe('proxy with trailing slash URL key', function() {
    let trailingApi;

    before(function(done) {
      config = new Config('dev', {
        port: port,
        cwd: 'tests',
        // The trailing slash in the key should be stripped before building the
        // path-to-regexp pattern, so /api-trailing/ → /api-trailing{/*_proxyRest}
        proxies: {
          '/api-trailing/': {
            target: 'http://localhost:13378',
          },
        },
      });
      baseUrl = 'http://localhost:' + port + '/';

      trailingApi = http.createServer(function(req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('proxied');
      });

      server = new Server(config);
      server.start();

      server.once('server-start', function() {
        trailingApi.listen(13378, function() {
          done();
        });
      });
    });

    after(function() {
      return server
        .stop()
        .then(() => new Promise((resolve) => trailingApi.close(resolve)));
    });

    it('proxies requests when the proxy URL key has a trailing slash', function(done) {
      client
        .get(baseUrl + 'api-trailing/hello')
        .then(function(res) {
          const text = bodyText(res);
          expect(res.statusCode).to.eq(200);
          expect(text).to.equal('proxied');
          done();
        })
        .catch(done);
    });
  });

  describe('proxy with multiple wildcards in URL key', function() {
    let wildcardApi;

    before(function(done) {
      config = new Config('dev', {
        port: port,
        cwd: 'tests',
        // Two * wildcards exercise the wIdx counter, which generates unique
        // named params (:_proxyW0, :_proxyW1) to keep the path-to-regexp
        // pattern valid under Express 5.
        proxies: {
          '/api*/v*': {
            target: 'http://localhost:13379',
          },
        },
      });
      baseUrl = 'http://localhost:' + port + '/';

      wildcardApi = http.createServer(function(req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('proxied');
      });

      server = new Server(config);
      server.start();

      server.once('server-start', function() {
        wildcardApi.listen(13379, function() {
          done();
        });
      });
    });

    after(function() {
      return server
        .stop()
        .then(() => new Promise((resolve) => wildcardApi.close(resolve)));
    });

    it('proxies requests when the proxy URL key contains multiple wildcards', function(done) {
      client
        .get(baseUrl + 'api1/v2/resource')
        .then(function(res) {
          const text = bodyText(res);
          expect(res.statusCode).to.eq(200);
          expect(text).to.equal('proxied');
          done();
        })
        .catch(done);
    });
  });

  describe('server start error', function() {
    it('rejects and emits server-error when port is already in use', function(done) {
      const occupiedConfig = new Config('dev', { port: 0, cwd: 'tests' });
      const occupiedServer = new Server(occupiedConfig);

      occupiedServer.start().then(function() {
        const occupiedPort = occupiedConfig.get('port');
        const conflictConfig = new Config('dev', {
          port: occupiedPort,
          cwd: 'tests',
        });
        const conflictServer = new Server(conflictConfig);
        let errorEmitted = false;

        conflictServer.on('server-error', function() {
          errorEmitted = true;
        });

        conflictServer
          .start()
          .then(function() {
            return occupiedServer.stop().then(function() {
              done(new Error('Expected start() to reject on port conflict'));
            });
          })
          .catch(function(err) {
            expect(err.code).to.eq('EADDRINUSE');
            expect(errorEmitted).to.eq(true);
            return occupiedServer.stop();
          })
          .then(function() {
            done();
          })
          .catch(done);
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

  function bodyText(res) {
    if (res.body == null) {
      return '';
    }
    if (Buffer.isBuffer(res.body)) {
      return res.body.toString('utf8');
    }
    return String(res.body);
  }

  function expectMiddlewareHeaders(res) {
    expect(res.headers['x-testem-middleware']).to.eq('success');
  }

  function assertUrlReturnsFileContents(url, file, done) {
    client
      .get(url)
      .then(function(res) {
        const text = bodyText(res);
        expect(res.statusCode).to.eq(200);
        expectMiddlewareHeaders(res);
        expect(text).to.equal(fs.readFileSync(file).toString());
        done();
      })
      .catch(done);
  }
});

function middleware(app) {
  app.use((_, res, next) => {
    res.setHeader('x-testem-middleware', 'success');
    next();
  });
}
