var os = require('os');
var path = require('path');
var fs = require('fs');
var url = require('url');
var pathToFileURL = url.pathToFileURL;
var { randomBytes } = require('crypto');
var { spawn, execFile } = require('child_process');
var { registerCleanup } = require('../../lib/utils/tmp-cleanup.js');

var baseObj = url.parse(process.argv[2]);
var testPageObj = url.parse(process.argv[3], true);
var id = process.argv[4];

// Find our electron binary. Requiring the package returns its path, and since
// Electron 45 also downloads the binary on first use.
var platform = os.platform();
var electronPath = require('electron');

// Build testem.js URL
baseObj.pathname = '/testem.js';
var testemJsUrl = url.format(baseObj);

// Process the HTML to point to the correct testem.js, and have a base URL
// pointing back to this directory.
var testPagePath = path.join.apply(null, testPageObj.pathname.split('/'));
var htmlContent = fs.readFileSync(testPagePath, 'utf8').toString();
var baseDirUrl = pathToFileURL(
  __dirname.endsWith(path.sep) ? __dirname : __dirname + path.sep
).href;
htmlContent = htmlContent.replace('<head>', '<head>\n<base href="' + baseDirUrl + '">');
htmlContent = htmlContent.replace('src="/testem.js"', 'src="' + testemJsUrl + '"');
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-'));
registerCleanup(tmpDir);
var tmpFilePath = path.join(tmpDir, randomBytes(8).toString('hex') + '.html');
fs.writeFileSync(tmpFilePath, htmlContent, 'utf8');

// Build a file: URL to our temp file, preserving query params from the test
// page and adding the testem id
var tmpFileObj = url.parse(pathToFileURL(tmpFilePath).href);
tmpFileObj.query = testPageObj.query;
tmpFileObj.query.testemId = id;
var testUrl = url.format(tmpFileObj);

var env = Object.assign({}, process.env);
delete env.ELECTRON_RUN_AS_NODE;
// Print Chromium's own errors and console messages to stderr. Testem shows a
// launcher's output when the browser fails, so this explains failed starts.
env.ELECTRON_ENABLE_LOGGING = '1';
var electronArgs = [testUrl];
if (platform === 'linux') {
  electronArgs.unshift('--no-sandbox');
}
// CI can ask for Chromium's verbose log in a file instead; the workflow prints
// it when the job fails.
if (process.env.ELECTRON_LOG_DIR) {
  fs.mkdirSync(process.env.ELECTRON_LOG_DIR, { recursive: true });
  delete env.ELECTRON_ENABLE_LOGGING;
  var logFile = path.join(process.env.ELECTRON_LOG_DIR, 'electron-' + id + '-' + Date.now() + '.log');
  electronArgs.unshift('--enable-logging=file', '--log-file=' + logFile, '--v=1');
}
console.error('Starting ' + electronPath + ' ' + electronArgs.join(' '));
// Keep pipes rather than inheriting stdio: if this script is killed outright,
// the closed pipes take Electron down with it.
var child = spawn(electronPath, electronArgs, { env: env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

// On macOS CI, save a screenshot and stack samples of Electron and its helpers
// next to the logs. A launch that is still running after 10s is probably hung,
// so that snapshot shows what it is waiting on. The one at 2s is taken on every
// launch, to compare against a healthy one.
if (process.env.ELECTRON_LOG_DIR && platform === 'darwin') {
  var snapshotTimers = [2, 10].map(function(seconds) {
    return setTimeout(function() {
      var prefix = path.join(process.env.ELECTRON_LOG_DIR, 'electron-' + id + '-' + Date.now() + '-' + seconds + 's');
      spawn('screencapture', ['-x', prefix + '-screen.png'], { stdio: 'ignore' });
      // The helpers (GPU, network, renderer) are children of the main process.
      execFile('pgrep', ['-P', String(child.pid)], function(error, stdout) {
        var pids = [child.pid].concat(stdout.split('\n').filter(Boolean));
        pids.forEach(function(pid) {
          spawn('sample', [String(pid), '3', '-file', prefix + '-sample-' + pid + '.txt'], { stdio: 'ignore' });
        });
      });
    }, seconds * 1000);
  });
  child.on('exit', function() {
    snapshotTimers.forEach(clearTimeout);
  });
}

child.on('error', function(error) {
  throw error;
});

child.on('exit', function(code, signal) {
  console.error('Electron exited with code ' + code + (signal ? ' (signal ' + signal + ')' : ''));
  process.exitCode = code === null ? 1 : code;
});

// Testem stops this launcher with SIGTERM, and tmp-cleanup.js exits the process
// on SIGTERM before any other handler runs. Stop Electron on exit instead.
process.on('exit', function() {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
  }
});
