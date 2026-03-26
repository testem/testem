var path  = require('path');
var http  = require('http');
var fs    = require('fs');
var { exec } = require('child_process');
var port  = 7358;
var server;

module.exports = {
  serve_files: [
    'instrumented/*.js'
  ],
  src_files: [
    'src/*.js'
  ],

  // proxy to the create http server
  // phantomjs has problems with POSTs to different port
  "proxies": {
    "/coverage": {
      "target": "http://localhost:7358"
    }
  },

  // instrument files, spin up http server to write coverage data to disk
  before_tests: function(config, data, callback)
  {
    exec('node ./node_modules/istanbul/lib/cli.js instrument --output instrumented src', function(err, stdout, stderr)
    {
      if (err) {
        callback(err.code, stdout + stderr);
        return;
      }

      // if instrumented successfully
      // start the server
      server = http.createServer(function(req, res) {
        console.error('... Received coverage of', req.headers['content-length'], 'length');
        // need separate files per browser/client
        req.pipe(fs.createWriteStream(path.join(__dirname, 'coverage-' + Math.random() + '.json')));
        // make sure we've got it all
        req.on('end', res.end.bind(res));
      }).listen(port, function(serverErr) {
        console.error('------ Listening for coverage on ' + port);
        // when server is ready
        // pass control back to testem
        callback(serverErr);
      });
    });
  },

  // after tests done, stop http server, combined coverage data into the report
  after_tests: function(config, data, callback)
  {
    // shutdown teh server
    server.close();

    // generate report
    exec('node ./node_modules/istanbul/lib/cli.js report', function(err, stdout, stderr) {
      if (err) return callback(err.code, stdout + stderr);

      // check on generated report
      var lcov = fs.existsSync(path.join(__dirname, 'coverage/lcov.info')) &&
        fs.readFileSync(path.join(__dirname, 'coverage/lcov.info'), 'utf8').indexOf('end_of_record') !== -1;
      var report = fs.existsSync(path.join(__dirname, 'coverage/lcov-report/index.html')) &&
        fs.readFileSync(path.join(__dirname, 'coverage/lcov-report/index.html'), 'utf8').indexOf('src/index.html') !== -1;

      if (!lcov || !report) {
        callback(new Error('Unable to generate report'));
        return;
      }

      // everything is good
      callback(null);
    });
  },

  test_page: 'tests.html',
  launch_in_dev: ['chrome']
}
