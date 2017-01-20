var os = require('os');
var path = require('path');
var fs = require('fs');
var url = require('url');
var fileUrl = require('file-url');
var tmp = require('tmp');
var execFile = require('child_process').execFile;

var baseObj = url.parse(process.argv[2]);
var testPageObj = url.parse(process.argv[3], true);
var id = process.argv[4];

// Find our electron binary
var platform = os.platform();
var electronModulePath = path.dirname(require.resolve('electron'));
var electronPath;

if (platform === 'darwin') {
  electronPath = path.join(electronModulePath, 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
} else if (platform === 'win32') {
  electronPath = path.join(electronModulePath, 'dist', 'electron.exe');
} else {
  electronPath = path.join(electronModulePath, 'dist', 'electron');
}

// Build testem.js URL
baseObj.pathname = '/testem.js';
var testemJsUrl = url.format(baseObj);

// Process the HTML to point to the correct testem.js, and have a base URL
// pointing back to this directory.
var testPagePath = path.join.apply(null, testPageObj.pathname.split('/'));
var htmlContent = fs.readFileSync(testPagePath, 'utf8').toString();
htmlContent = htmlContent.replace('<head>', '<head>\n<base href="' + fileUrl(__dirname) + '/">');
htmlContent = htmlContent.replace('src="/testem.js"', 'src="' + testemJsUrl + '"');
var tmpFile = tmp.fileSync({ postfix: '.html' });
fs.writeFileSync(tmpFile.name, htmlContent, 'utf8');

// Build a file: URL to our temp file, preserving query params from the test
// page and adding the testem id
var tmpFileObj = url.parse(fileUrl(tmpFile.name));
tmpFileObj.query = testPageObj.query;
tmpFileObj.query.testemId = id;
var testUrl = url.format(tmpFileObj);

var child = execFile(electronPath, [testUrl], function(error) {
  if (error) {
    throw error;
  }
});

process.on('SIGTERM', function() {
  child.kill();
});
