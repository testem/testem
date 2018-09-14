/*

server.js
=========

Testem's server. Serves up the HTML, JS, and CSS required for
running the tests in a browser.

*/
'use strict';

const express = require('express');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
const log = require('npmlog');
const EventEmitter = require('events').EventEmitter;
const Mustache = require('consolidate').mustache;
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const Bluebird = require('bluebird');

const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const access = promisify(fs.access);

const dirListingPage = `${__dirname}/../../views/directorylisting.mustache`;

const defaultAcceptCheck = [
  'html',
  'css',
  'javascript',
  'text'
];

const asyncMiddleware = (fn) =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

class Server extends EventEmitter {
  constructor(config) {
    super();

    this.config = config;
    this.ieCompatMode = null;

    // Maintain a hash of all connected sockets to close them manually
    // Workaround https://github.com/joyent/node/issues/9066
    this.sockets = {};
    this.nextSocketId = 0;
  }

  start(callback) {
    this.express = this.createExpress();

    // Start the server!
    // Create socket.io sockets
    this.server.on('connection', socket => {
      var socketId = this.nextSocketId++;
      this.sockets[socketId] = socket;
      socket.on('close', () => {
        delete this.sockets[socketId];
      });
    });

    return new Bluebird.Promise((resolve, reject) => {
      this.server.on('listening', () => {
        this.config.set('port', this.server.address().port);
        resolve();
        this.emit('server-start');
      });
      this.server.on('error', e => {
        this.stopped = true;
        reject(e);
        this.emit('server-error', e);
      });

      this.server.listen(this.config.get('port'));
    }).asCallback(callback);
  }

  stop(callback) {
    if (this.server && !this.stopped) {
      this.stopped = true;

      return Bluebird.fromCallback(closeCallback => {
        this.server.close(closeCallback);

        // Destroy all open sockets
        for (var socketId in this.sockets) {
          this.sockets[socketId].destroy();
        }
      }).asCallback(callback);
    } else {
      return Bluebird.resolve().asCallback(callback);
    }
  }

  createExpress() {
    const socketHeartbeatTimeout = this.config.get('socket_heartbeat_timeout');
    const app = express();
    const serveStaticFile = (asyncMiddleware(async (req, res) => {
      await this.serveStaticFile(req.params[0], req, res);
    }));

    let options = {};

    if (this.config.get('key') || this.config.get('pfx')) {
      if (this.config.get('key')) {
        options.key = fs.readFileSync(this.config.get('key'));
        options.cert = fs.readFileSync(this.config.get('cert'));
      } else {
        options.pfx = fs.readFileSync(this.config.get('pfx'));
      }
      this.server = https.createServer(options, app);
    } else {
      this.server = http.createServer(app);
    }

    this.io = socketIO(this.server);
    this.io.set('heartbeat timeout', socketHeartbeatTimeout * 1000);
    this.io.on('connection', this.onClientConnected.bind(this));

    this.configureExpress(app);
    this.injectMiddleware(app);
    this.configureProxy(app);

    app.get('/', (req, res) => {
      res.redirect(`/${String(Math.floor(Math.random() * 10000))}`);
    });

    app.get(/\/(-?[0-9]+)$/, asyncMiddleware(async (req, res) => {
      await this.serveHomePage(req, res);
    }))

    app.get('/testem.js', asyncMiddleware(async (req, res) => {
      await this.serveTestemClientJs(req, res);
    }));

    app.all(/^\/(?:-?[0-9]+)(\/.+)$/, serveStaticFile);
    app.all(/^(.+)$/, serveStaticFile);

    app.use((err, req, res, next) => {
      if (err) {
        console.log(err)
        log.error(err.message);
        if (err.code === 'ENOENT') {
          res.status(404).send(`Not found: ${req.url}`);
        } else {
          res.status(500).send(err.message);
        }
      } else {
        next();
      }
    });

    return app;
  }

  configureExpress(app) {
    app.engine('mustache', Mustache);
    app.set('view options', {layout: false});
    app.use((req, res, next) => {
      if (this.ieCompatMode) {
        res.setHeader('X-UA-Compatible', `IE=${this.ieCompatMode}`);
      }
      next();
    });
    app.use(express.static(`${__dirname}/../../public`));
  }

  injectMiddleware(app) {
    var middlewares = this.config.get('middleware');

    if (middlewares) {
      middlewares.forEach(middleware => {
        middleware(app);
      });
    }
  }

  shouldProxy(req, opts) {
    //Only apply filtering logic if 'onlyContentTypes' key is present
    if (!('onlyContentTypes' in opts)) {
      return true;
    }
    const derivedAcceptsCheck = defaultAcceptCheck.concat([...opts.onlyContentTypes]);

    return req.accepts(derivedAcceptsCheck).indexOf(opts.onlyContentTypes) !== -1;
  }

  configureProxy(app) {
    const proxies = this.config.get('proxies');
    if (proxies) {
      this.proxy = new httpProxy.createProxyServer({changeOrigin: true});

      this.proxy.on('error', (err, req, res) => {
        res.status(500).json(err);
      });

      Object.keys(proxies).forEach(url => {
        app.all(`${url}*`, (req, res, next) => {
          var opts = proxies[url];
          if (this.shouldProxy(req, opts)) {
            if (opts.host) {
              opts.target = `http://${opts.host}:${opts.port}`;
              delete opts.host;
              delete opts.port;
            }
            this.proxy.web(req, res, opts);
          } else {
            next();
          }
        });
      });
    }
  }

  renderRunnerPage(err, files, footerScripts, res) {
    const { config } = this;
    const framework = config.get('framework') || 'jasmine';
    const css_files = config.get('css_files');

    const templateFile = {
      jasmine: 'jasminerunner',
      jasmine2: 'jasmine2runner',
      qunit: 'qunitrunner',
      mocha: 'mocharunner',
      'mocha+chai': 'mochachairunner',
      buster: 'busterrunner',
      custom: 'customrunner',
      tap: 'taprunner'
    }[framework] + '.mustache';

    res.render(`${__dirname}/../../views/${templateFile}`, {
      scripts: files,
      styles: css_files,
      footer_scripts: footerScripts
    });
  }

  renderDefaultTestPage(req, res) {
    res.header('Cache-Control', 'No-cache');
    res.header('Pragma', 'No-cache');

    var config = this.config;
    var test_page = config.get('test_page')[0];

    if (test_page) {
      if (test_page[0] === '/') {
        test_page = encodeURIComponent(test_page);
      }
      var base = req.path === '/' ?
        req.path : `${req.path}/`;
      var url = base + test_page;
      res.redirect(url);
    } else {
      config.getServeFiles((err, files) => {
        config.getFooterScripts((err, footerScripts) => {
          this.renderRunnerPage(err, files, footerScripts, res);
        });
      });
    }
  }

  async serveHomePage(req, res) {
    var config = this.config;
    var routes = config.get('routes') || config.get('route') || {};
    if (routes['/']) {
      return await this.serveStaticFile('/', req, res);
    } else {
      return this.renderDefaultTestPage(req, res);
    }
  }

  async serveTestemClientJs(req, res) {
    res.setHeader('Content-Type', 'text/javascript');

    res.write(';(function(){');
    res.write('\n//============== config ==================\n\n');
    res.write(`var TestemConfig = ${JSON.stringify(this.config.client())};`);

    var files = [
      'decycle.js',
      'jasmine_adapter.js',
      'jasmine2_adapter.js',
      'qunit_adapter.js',
      'mocha_adapter.js',
      'buster_adapter.js',
      'testem_client.js'
    ];

    for(let file of files) {
      if (file.indexOf(path.sep) === -1) {
        file = `${__dirname}/../../public/testem/${file}`;
      }
      try {
        const data = await readFile(file);
        res.write(`\n//============== ${path.basename(file)} ==================\n\n`);
        res.write(data);
      } catch(err) {
        res.write(`// Error reading ${file}: ${err}`);
      }
    }

    res.write('}());');
    res.end();
  }

  async route(uri) {
    const { config } = this;
    const routes = config.get('routes') || config.get('route') || {};
    const prefixes = Object.keys(routes);

    let bestMatchLength = 0;
    let bestMatch = null;

    for(const prefix of prefixes) {
      if (uri.substring(0, prefix.length) === prefix) {
        if (bestMatchLength < prefix.length) {
          if (routes[prefix] instanceof Array) {
            routes[prefix].some(folder => {
              bestMatch = `${folder}/${uri.substring(prefix.length)}`;
              return fs.existsSync(config.resolvePath(bestMatch));
            });
          } else {
            bestMatch = `${routes[prefix]}/${uri.substring(prefix.length)}`;
          }
          bestMatchLength = prefix.length;
        }
      }
    }

    return {
      routed: !!bestMatch,
      uri: bestMatch || uri.substring(1)
    };
  }

  async serveStaticFile(uri, req, res) {
    const config = this.config;
    const routeRes = await this.route(uri);
    const routeURI = routeRes.uri;
    const wasRouted = routeRes.routed;
    const allowUnsafeDirs = config.get('unsafe_file_serving');
    const filePath = path.resolve(config.resolvePath(routeURI || uri));
    const ext = path.extname(filePath);
    const isPathPermitted = filePath.indexOf(path.resolve(config.cwd())) !== -1;

    if (!wasRouted && !allowUnsafeDirs && !isPathPermitted) {
      res.status(403);
      res.write('403 Forbidden');
      res.end();
    } else if (ext === '.mustache') {
      config.getTemplateData((err, data) => {
        res.render(filePath, data);
        this.emit('file-requested', filePath);
      });
    } else {
      try {
        const _stat = await stat(filePath);
        this.emit('file-requested', filePath);

        if (_stat.isDirectory()) {
          const files = await readdir(filePath);

          res.render(dirListingPage, {files: files});
        } else {
          res.sendFile(filePath);
        }
      } catch(ex) {
        return res.sendFile(filePath);
      }
    }
  }

  onClientConnected(client) {
    client.once('browser-login', (browserName, id) => {
      log.info(`New client connected: ${browserName} ${id}`);
      this.emit('browser-login', browserName, id, client);
    });
  }
}

module.exports = Server;
