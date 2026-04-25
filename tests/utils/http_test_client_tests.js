const { expect } = require('chai');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const {
  httpRequest,
  listenPromise,
  closePromise,
} = require('./http_test_client');

describe('http_test_client', function() {
  describe('listenPromise', function() {
    it('resolves when the server is listening on the port', async function() {
      const s = http.createServer();
      const p = 0;
      await listenPromise(s, p);
      expect(s.listening).to.equal(true);
      const addr = s.address();
      expect(addr.port).to.be.greaterThan(0);
      await closePromise(s);
    });

    it('rejects when listen fails (port already in use)', async function() {
      const a = http.createServer();
      const b = http.createServer();
      await listenPromise(a, 0);
      const port = a.address().port;
      try {
        await listenPromise(b, port);
        expect.fail('expected listen to reject');
      } catch (err) {
        expect(err.code).to.equal('EADDRINUSE');
      } finally {
        await closePromise(a);
      }
    });
  });

  describe('closePromise', function() {
    it('resolves when the server closes', async function() {
      const s = http.createServer();
      await listenPromise(s, 0);
      await closePromise(s);
      expect(s.listening).to.equal(false);
    });
  });

  describe('httpRequest', function() {
    it('performs a GET and returns status, lowercased headers, and body', async function() {
      const s = http.createServer(function (req, res) {
        res.setHeader('X-Custom-Example', 'ok');
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(200);
        res.end('hello');
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      try {
        const { res, text } = await httpRequest(
          'http://127.0.0.1:' + port + '/',
        );
        expect(res.statusCode).to.equal(200);
        expect(res.headers['content-type']).to.match(/text\/plain/);
        expect(res.headers['x-custom-example']).to.equal('ok');
        expect(text).to.equal('hello');
      } finally {
        await closePromise(s);
      }
    });

    it('uses followRedirect: false to leave a 3xx and expose Location', async function() {
      const s = http.createServer(function (req, res) {
        if (req.url === '/from') {
          res.writeHead(302, { Location: '/to' });
          res.end();
        } else {
          res.writeHead(200);
          res.end('arrived');
        }
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      const base = 'http://127.0.0.1:' + port;
      try {
        const { res, text } = await httpRequest(base + '/from', {
          followRedirect: false,
        });
        expect(res.statusCode).to.equal(302);
        expect(res.headers.location).to.equal('/to');
        expect(text).to.equal('');
      } finally {
        await closePromise(s);
      }
    });

    it('follows redirects by default and returns the final body', async function() {
      const s = http.createServer(function (req, res) {
        if (req.url === '/from') {
          res.writeHead(302, { Location: '/to' });
          res.end();
        } else {
          res.writeHead(200);
          res.end('final');
        }
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      const base = 'http://127.0.0.1:' + port;
      try {
        const { res, text } = await httpRequest(base + '/from');
        expect(res.statusCode).to.equal(200);
        expect(text).to.equal('final');
      } finally {
        await closePromise(s);
      }
    });
  });

  describe('httpRequest.get', function() {
    it('sends a GET for a string URL and for an object with url and headers', async function() {
      const s = http.createServer(function (req, res) {
        if (req.url === '/h') {
          expect(req.headers['x-req-test']).to.equal('1');
        }
        res.writeHead(200);
        res.end('get-ok');
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      const base = 'http://127.0.0.1:' + port;
      try {
        const a = await httpRequest.get(base + '/');
        expect(a.text).to.equal('get-ok');
        const b = await httpRequest.get({
          url: base + '/h',
          headers: { 'X-Req-Test': '1' },
        });
        expect(b.text).to.equal('get-ok');
      } finally {
        await closePromise(s);
      }
    });
  });

  describe('httpRequest.post', function() {
    it('sends a POST with body', async function() {
      const s = http.createServer(function (req, res) {
        let b = '';
        req.on('data', function (c) {
          b += c;
        });
        req.on('end', function() {
          res.writeHead(200);
          res.end('echo:' + b);
        });
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      const base = 'http://127.0.0.1:' + port;
      try {
        const { text } = await httpRequest.post({
          url: base + '/',
          body: 'payload',
        });
        expect(text).to.equal('echo:payload');
      } finally {
        await closePromise(s);
      }
    });
  });

  describe('httpRequest.del', function() {
    it('sends a DELETE', async function() {
      const s = http.createServer(function (req, res) {
        if (req.method === 'DELETE') {
          res.writeHead(200);
          res.end('deleted');
        } else {
          res.writeHead(405);
          res.end();
        }
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      const base = 'http://127.0.0.1:' + port;
      try {
        const { res, text } = await httpRequest.del(base + '/d');
        expect(res.statusCode).to.equal(200);
        expect(text).to.equal('deleted');
      } finally {
        await closePromise(s);
      }
    });
  });

  describe('httpRequest with strictSSL: false', function() {
    it('fetches a self-signed HTTPS server without verify errors', async function() {
      const key = fs.readFileSync(
        path.join(__dirname, '../fixtures/certs/localhost.key'),
      );
      const cert = fs.readFileSync(
        path.join(__dirname, '../fixtures/certs/localhost.cert'),
      );
      const s = https.createServer({ key, cert }, function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('tls-ok');
      });
      await listenPromise(s, 0);
      const port = s.address().port;
      const url = 'https://127.0.0.1:' + port + '/';
      try {
        const { res, text } = await httpRequest({ url, strictSSL: false });
        expect(res.statusCode).to.equal(200);
        expect(text).to.equal('tls-ok');
      } finally {
        await closePromise(s);
      }
    });
  });
});
