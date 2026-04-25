const Server = require('../lib/server');
const Config = require('../lib/config');
const path = require('path');
const { once } = require('node:events');
const { httpRequest, listenPromise, closePromise } = require(
  './utils/http_test_client',
);
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
    before(async function() {
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
      const started = once(server, 'server-start');
      server.start();
      await started;
    });
    after(function() {
      return server.stop();
    });

    describe('routing and redirects', function() {
      it('redirects to an id', async function() {
        const { res } = await httpRequest(baseUrl, { followRedirect: false });
        expect(res.statusCode).to.eq(302);
        expect(res.headers.location).to.match(/^\/[0-9]+$/);
        expectMiddlewareHeaders(res);
      });

      it('serves the homepage after redirect', async function() {
        const { res } = await httpRequest(baseUrl, { followRedirect: true });
        expect(res.statusCode).to.eq(200);
        expectMiddlewareHeaders(res);
      });

      it('serves the homepage for a numeric browser id directly', async function() {
        const { res } = await httpRequest(baseUrl + '1234');
        expect(res.statusCode).to.eq(200);
        expectMiddlewareHeaders(res);
      });

      it('serves the homepage for tap id (-1) directly', async function() {
        const { res } = await httpRequest(baseUrl + '-1');
        expect(res.statusCode).to.eq(200);
        expectMiddlewareHeaders(res);
      });
    });

    describe('test page rendering', function() {
      it('gets scripts for the home page', async function() {
        const { res, text } = await httpRequest(baseUrl);
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
      });

      it('serves custom test page', async function() {
        config.set('test_page', 'web/tests.html');
        await assertUrlReturnsFileContents(baseUrl, 'tests/web/tests.html');
      });

      it('renders custom test page as template', async function() {
        config.set('test_page', 'web/tests_template.mustache');
        const { res, text } = await httpRequest(baseUrl);
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
      });

      it('renders the first test page by default when multiple are provided', async function() {
        config.set('test_page', [
          'web/tests_template.mustache',
          'web/tests.html',
        ]);
        const { res, text } = await httpRequest(baseUrl);
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
      });

      it('URL-encodes test_page path that starts with a slash', async function() {
        config.set('test_page', '/my/custom-page.html');
        const { res } = await httpRequest(baseUrl + '1234', {
          followRedirect: false,
        });
        expect(res.statusCode).to.eq(302);
        expect(res.headers.location).to.include('%2F');
      });
    });

    describe('testem.js', function() {
      it('gets testem.js', async function() {
        await httpRequest(baseUrl + '/testem.js');
      });

      it('gets testem.js with expected content', async function() {
        const { res, text } = await httpRequest(baseUrl + 'testem.js');
        expect(res.statusCode).to.eq(200);
        expect(res.headers['content-type']).to.match(/javascript/);
        expect(text).to.include('TestemConfig');
        expect(text).to.include('testem_client.js');
      });
    });

    describe('static file serving', function() {
      it('gets src file', async function() {
        await assertUrlReturnsFileContents(
          baseUrl + 'web/hello.js',
          'tests/web/hello.js',
        );
      });

      it('gets bundled files', async function() {
        await assertUrlReturnsFileContents(
          baseUrl + 'testem/connection.html',
          'public/testem/connection.html',
        );
      });

      it('gets a file using a POST request', async function() {
        const { res, text } = await httpRequest.post(baseUrl + 'web/hello.js');
        expect(text).to.equal(
          fs.readFileSync('tests/web/hello.js').toString(),
        );
        expectMiddlewareHeaders(res);
      });

      it('lists directories', async function() {
        const { res, text } = await httpRequest(baseUrl + 'data');
        expect(text).to.match(/<a href="blah.txt">blah.txt<\/a>/);
        expectMiddlewareHeaders(res);
      });

      it('returns 404 for a non-existent file', async function() {
        const { res, text } = await httpRequest(
          baseUrl + 'web/does-not-exist.js',
        );
        expect(res.statusCode).to.eq(404);
        expect(text).to.match(/Not found/);
      });

      it('serves local content with browser ids', async function() {
        await assertUrlReturnsFileContents(
          baseUrl + '1234' + '/web/hello.js',
          'tests/web/hello.js',
        );
      });

      it('serves local content with tap id', async function() {
        await assertUrlReturnsFileContents(
          baseUrl + '-1' + '/web/hello.js',
          'tests/web/hello.js',
        );
      });

      it('serves local content with any negative numeric id', async function() {
        await assertUrlReturnsFileContents(
          baseUrl + '-5' + '/web/hello.js',
          'tests/web/hello.js',
        );
      });

      it('serves a non-numeric single-segment path as a static file', async function() {
        // A single slug like /data should fall through the numeric /:id guard
        // and be served via the /*file catch-all route as a directory listing.
        const { res } = await httpRequest(baseUrl + 'data');
        expect(res.statusCode).to.eq(200);
      });

      it('accepts other http methods', async function() {
        const { res } = await httpRequest.del(
          baseUrl + '-1' + '/web/hello.js',
        );
        expect(res.statusCode).to.eq(200);
        expectMiddlewareHeaders(res);
      });
    });

    describe('socket.io configuration', function() {
      it('sets heartbeat_timeout on socket.io server', function() {
        expect(server.io.eio.opts.pingTimeout).to.eq(6000);
      });
    });

    describe('route config', function() {
      it('routes server paths to local paths', async function() {
        await assertUrlReturnsFileContents(
          baseUrl + 'direct-test/test.js',
          'tests/web/direct/test.js',
        );
      });

      it('allows fallback paths', async function() {
        await Promise.all([
          assertUrlReturnsFileContents(
            baseUrl + 'fallback-test/test.js',
            'tests/web/direct/test.js',
          ),
          assertUrlReturnsFileContents(
            baseUrl + 'fallback-test/test2.js',
            'tests/web/fallback/test2.js',
          ),
        ]);
      });
    });

    describe('proxies', function() {
      let api1, api2, api3, api4, wsapi_server, wssapi_server;

      beforeEach(async function() {
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

        await listenPromise(api1, 13372);
        await listenPromise(api2, 13373);
        await listenPromise(api3, 13374);
        await listenPromise(api4, 13375);
        await listenPromise(wsapi_server, 13376);
        await listenPromise(wssapi_server, 13377);
      });

      afterEach(async function() {
        await closePromise(api1);
        await closePromise(api2);
        await closePromise(api3);
        await closePromise(api4);
        await closePromise(wsapi_server);
        await closePromise(wssapi_server);
      });

      it('proxies get request to api1', async function() {
        const { res, text } = await httpRequest.get(baseUrl + 'api1/hello');
        expect(text).to.equal('API');
        expectMiddlewareHeaders(res);
      });

      it('proxies get request with deep subpath to api1', async function() {
        const { res, text } = await httpRequest.get(
          baseUrl + 'api1/foo/bar/baz',
        );
        expect(text).to.equal('API');
        expectMiddlewareHeaders(res);
      });

      it('proxies get request to api2', async function() {
        let options = {
          url: baseUrl + 'api2/hello',
          headers: {
            'Content-Type': 'application/json',
          },
        };
        const { res, text } = await httpRequest.get(options);
        expect(text).to.equal('API - 2');
        expectMiddlewareHeaders(res);
      });

      it('proxies post request to api1', async function() {
        let options = {
          url: baseUrl + 'api1/hello',
          headers: {
            Accept: 'application/json',
          },
        };
        const { res, text } = await httpRequest.post(options);
        expect(text).to.equal('API');
        expectMiddlewareHeaders(res);
      });

      it('proxies get request to api3', async function() {
        let options = {
          url: baseUrl + 'api3/test',
          headers: {
            Accept: 'application/json',
          },
        };
        const { res, text } = await httpRequest.get(options);
        expect(text).to.equal('{"API":3}');
        expectMiddlewareHeaders(res);
      });

      it('proxies post request to api3', async function() {
        let options = {
          url: baseUrl + 'api3/test',
          headers: {
            Accept: 'application/json',
          },
        };
        const { res, text } = await httpRequest.post(options);
        expect(text).to.equal('{"API":3}');
        expectMiddlewareHeaders(res);
      });

      it('proxies post request to api4', async function() {
        let options = {
          url: baseUrl + 'api4/test',
          headers: {
            Accept: 'application/json',
          },
          body: '{test: \'some value\'}',
        };
        const { res, text } = await httpRequest.post(options);
        expect(text).to.equal('{test: \'some value\'}');
        expectMiddlewareHeaders(res);
      });

      it('proxies get html request to api3', async function() {
        let options = {
          url: baseUrl + 'api3/test',
          headers: {
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
        };
        const { res, text } = await httpRequest.get(options);
        expect(text).to.equal('Not found: /api3/test');
        expectMiddlewareHeaders(res);
      });

      it('returns an error when a requst can not be proxied', async function() {
        let options = {
          url: baseUrl + 'api-error/test',
        };
        const { res, text } = await httpRequest.get(options);
        expect(res.statusCode).to.eq(500);
        expect(text).to.match(/ECONNREFUSED/);
        expectMiddlewareHeaders(res);
      });

      it('proxies WebSocket to wsapi (ws → ws)', async function() {
        const wsMsg = 'Hello over wsapi: 341bcb0e-db49-468d-924b-135645cafb90';
        const wsPingMsg =
          'Ping over wsapi: bb161729-414d-4861-8090-db3bbbe728d3';
        const wsapi = new ws.Server({ server: wsapi_server });
        const wsapiPromise = new Promise(function (resolve, reject) {
          wsapi.on('connection', function(socket) {
            socket.on('message', function(message) {
              try {
                expect(message.toString()).to.equal(wsMsg);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            socket.on('ping', function(data) {
              expect(data.toString()).to.equal(wsPingMsg);
            });
          });
        });
        const wsClient = new ws.WebSocket('ws://localhost:' + port + '/wsapi');
        wsClient.on('error', function () {
          wsapi.close();
        });

        const openPromise = new Promise(function (resolve, reject) {
          wsClient.on('open', function() {
            wsClient.on('pong', function(data) {
              expect(data.toString()).to.equal(wsPingMsg);
              wsClient.send(wsMsg, { binary: false }, function() {
                wsClient.close();
              });
            });
            wsClient.ping(wsPingMsg);
            resolve();
          });
          wsClient.on('error', reject);
        });
        await openPromise;
        await wsapiPromise;
        wsapi.close();
      });

      it('proxies WebSocket to wssapi (ws → wss)', async function() {
        const wssMsg =
          'Hello over wssapi: 5a120d3f-be82-408f-99ec-be92e7cd8ab7';
        const wssPingMsg =
          'Ping over wssapi: 19c0c2eb-52a3-4be3-83d1-f93eb35479ca';
        const wssapi = new ws.Server({ server: wssapi_server });
        const wssapiPromise = new Promise(function (resolve, reject) {
          wssapi.on('connection', function(socket) {
            socket.on('message', function(message) {
              try {
                expect(message.toString()).to.equal(wssMsg);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            socket.on('ping', function(data) {
              expect(data.toString()).to.equal(wssPingMsg);
            });
          });
        });
        const wssClient = new ws.WebSocket(
          'ws://localhost:' + port + '/wssapi',
        );
        wssClient.on('error', function () {
          wssapi.close();
        });

        const openPromise = new Promise(function (resolve, reject) {
          wssClient.on('open', function() {
            wssClient.on('pong', function(data) {
              expect(data.toString()).to.equal(wssPingMsg);
              wssClient.send(wssMsg, { binary: false }, function() {
                wssClient.close();
              });
            });
            wssClient.ping(wssPingMsg);
            resolve();
          });
          wssClient.on('error', reject);
        });
        await openPromise;
        await wssapiPromise;
        wssapi.close();
      });
    });
  });

  describe('a wildcard proxy', function() {
    let api;

    before(async function() {
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
      const started = once(server, 'server-start');
      server.start();
      await started;
      await listenPromise(api, 13372);
    });
    after(async function() {
      await server.stop();
      await closePromise(api);
    });

    it('does not proxy testem files', async function() {
      const { text: t1 } = await httpRequest.get(baseUrl + 'foo/bar');
      expect(t1).to.equal('proxied');
      const { text: t2 } = await httpRequest.get(
        baseUrl + 'testem/connection.html',
      );
      expect(t2).to.not.equal('proxied');
    });
  });

  describe('https', function() {
    before(async function() {
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
      const started = once(server, 'server-start');
      server.start();
      await started;
    });
    after(function() {
      return server.stop();
    });

    it('gets the home page', async function() {
      await httpRequest({ url: baseUrl, strictSSL: false });
    });
  });

  describe('https with pfx certificate', function() {
    before(async function() {
      config = new Config('dev', {
        port: port,
        pfx: 'tests/fixtures/certs/localhost.pfx',
        cwd: 'tests',
      });
      baseUrl = 'https://localhost:' + port + '/';

      server = new Server(config);
      const started = once(server, 'server-start');
      server.start();
      await started;
    });
    after(function() {
      return server.stop();
    });

    it('gets the home page over https via pfx certificate', async function() {
      await httpRequest({ url: baseUrl, strictSSL: false });
    });
  });

  describe('auto port assignment', function() {
    before(async function() {
      config = new Config('dev', {
        port: 0,
        cwd: 'tests',
      });
      server = new Server(config);
      const started = once(server, 'server-start');
      server.start();
      await started;
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
    before(async function() {
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
      const started = once(server, 'server-start');
      server.start();
      await started;
    });
    after(function() {
      return server.stop();
    });

    it('handles a request for safe content', async function() {
      const { res } = await httpRequest(baseUrl + 'web/hello.js');
      expect(res.statusCode).to.eq(200);
    });

    it('rejects a request for unsafe content', async function() {
      // WHATWG URL / fetch join collapses ".." in the path; use encoding so
      // the request path is still a traversal to ../public/... on the server.
      const { res } = await httpRequest(
        baseUrl + '%2E%2E%2Fpublic%2F.eslintrc.js',
      );
      expect(res.statusCode).to.eq(403);
    });
  });

  describe('routes["/"] config', function() {
    let routesServer, routesBaseUrl;

    before(async function() {
      const routesConfig = new Config('dev', {
        port: port,
        cwd: 'tests',
        routes: { '/': 'web/direct' },
      });
      routesBaseUrl = 'http://localhost:' + port + '/';
      routesServer = new Server(routesConfig);
      const started = once(routesServer, 'server-start');
      routesServer.start();
      await started;
    });

    after(function() {
      return routesServer.stop();
    });

    it('serves static file instead of the default runner when routes["/"] is set', async function() {
      const { res, text } = await httpRequest(routesBaseUrl + '1234');
      expect(res.statusCode).to.eq(200);
      expect(text).to.include('test.js');
    });
  });

  describe('proxy with trailing slash URL key', function() {
    let trailingApi;

    before(async function() {
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
      const started = once(server, 'server-start');
      server.start();
      await started;
      await listenPromise(trailingApi, 13378);
    });

    after(async function() {
      await server.stop();
      await closePromise(trailingApi);
    });

    it('proxies requests when the proxy URL key has a trailing slash', async function() {
      const { res, text } = await httpRequest.get(
        baseUrl + 'api-trailing/hello',
      );
      expect(res.statusCode).to.eq(200);
      expect(text).to.equal('proxied');
    });
  });

  describe('proxy with multiple wildcards in URL key', function() {
    let wildcardApi;

    before(async function() {
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
      const started = once(server, 'server-start');
      server.start();
      await started;
      await listenPromise(wildcardApi, 13379);
    });

    after(async function() {
      await server.stop();
      await closePromise(wildcardApi);
    });

    it('proxies requests when the proxy URL key contains multiple wildcards', async function() {
      const { res, text } = await httpRequest.get(
        baseUrl + 'api1/v2/resource',
      );
      expect(res.statusCode).to.eq(200);
      expect(text).to.equal('proxied');
    });
  });

  describe('server start error', function() {
    it('rejects and emits server-error when port is already in use', async function() {
      const occupiedConfig = new Config('dev', { port: 0, cwd: 'tests' });
      const occupiedServer = new Server(occupiedConfig);

      await occupiedServer.start();
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

      try {
        await conflictServer.start();
      } catch (err) {
        expect(err.code).to.eq('EADDRINUSE');
        expect(errorEmitted).to.eq(true);
        await occupiedServer.stop();
        return;
      }
      await occupiedServer.stop();
      throw new Error('Expected start() to reject on port conflict');
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

async function assertUrlReturnsFileContents(url, file) {
  const { res, text } = await httpRequest(url);
  expect(res.statusCode).to.eq(200);
  expectMiddlewareHeaders(res);
  expect(text).to.equal(fs.readFileSync(file).toString());
}
