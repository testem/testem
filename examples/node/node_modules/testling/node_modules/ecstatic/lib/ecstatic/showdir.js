var ecstatic = require('../ecstatic'),
    fs = require('fs'),
    path = require('path'),
    ent = require('ent'),
    etag = require('./etag'),
    url = require('url'),
    status = require('./status-handlers');

module.exports = function (dir, pathname, stat, cache) {
  var root = path.resolve(dir) + '/';

  return function (req, res, next) {

    if (typeof pathname === 'undefined') {
      pathname = url.parse(req.url).pathname;
    }

    if (typeof file === 'undefined') {
      file = path.normalize(path.join(root, pathname));
    }

    if (typeof cache === 'undefined') {
      cache = 3600;
    }

    (function (cb) {
      fs.stat(file, cb);
    })(function (err, stat) {
      if (err) {
        return status[500](res, next, { error: err });
      }

      fs.readdir(dir + pathname, function (err, files) {
        if (err) {
          return status[500](res, next, { error: err });
        }

        res.setHeader('content-type', 'text/html');
        res.setHeader('etag', etag(stat));
        res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString());
        res.setHeader('cache-control', 'max-age='+cache);

        var sortByIsDirectory = function (paths, cb) {
          var pending = paths.length,
              errs = [],
              dirs = [],
              files = [];

          paths.forEach(function (file) {
            fs.stat(dir + pathname + '/' + file, function (err, s) {
              if (err) {
                errs.push(err);
              }
              else if (s.isDirectory()) {
                dirs.push(file);
              }
              else {
                files.push(file);
              }
                
              if (--pending === 0) {
                cb(errs, dirs, files);
              }
            });
          });
        }

        sortByIsDirectory(files, function (errs, dirs, files) {

          if (errs.length > 0) {
            return status[500](res, next, { error: errs[0] });
          }

          // Lifted from nodejitsu's http server.
          var html = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"\
            "http://www.w3.org/TR/html4/loose.dtd">\
            <html> \
              <head> \
                <title>Index of ' + pathname +'</title> \
              </head> \
              <body> \
            <h1>Index of ' + pathname + '</h1>';

          html += '<table>';

          var writeRow = function (file, i)  {
            html += '<tr><td>' + '<a href="'
              + ent.encode(encodeURI(
                ((req.url == '/') ? '' : req.url)
                + '/'
                + file
              )) + '">' + ent.encode(file) + '</a></td></tr>';
          }

          dirs.sort().forEach(writeRow);
          files.sort().forEach(writeRow);

          html += '</table>';
          html += '<br><address>Node.js '
            + process.version
            + '/<a href="https://github.com/jesusabdullah/node-ecstatic">ecstatic</a>'
            + ' server running @ '
            + ent.encode(req.headers.host) + '</address>'
            + '</body></html>'
          ;

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(html);
        });
      });
    });
  }
};
