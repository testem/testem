var path = require('path'),
    fs = require('fs'),
    url = require('url'),
    mime = require('mime'),
    showDir = require('./ecstatic/showdir'),
    version = JSON.parse(
      fs.readFileSync(__dirname + '/../package.json').toString()
    ).version,
    status = require('./ecstatic/status-handlers'),
    etag = require('./ecstatic/etag'),
    optsParser = require('./ecstatic/opts');

var ecstatic = module.exports = function (dir, options) {
  var root = path.join(path.resolve(dir), '/'),
      opts = optsParser(options),
      cache = opts.cache,
      autoIndex = opts.autoIndex;
  
  return function middleware (req, res, next) {

    // Figure out the path for the file from the given url
    var parsed = url.parse(req.url),
        pathname = decodeURI(parsed.pathname),
        file = path.normalize(path.join(root, pathname));

    // Set common headers.
    res.setHeader('server', 'ecstatic-'+version);
    res.setHeader('date', (new Date()).toUTCString());

    if (file.slice(0, root.length) !== root) {
      return status[403](res, next);
    }

    if (req.method && (req.method !== 'GET' && req.method !== 'HEAD' )) {
      return status[405](res, next);
    }

    fs.stat(file, function (err, stat) {
      if (err && err.code === 'ENOENT') {

        if (req.statusCode == 404) {
          // This means we're already trying ./404.html
          status[404](res, next);
        }
        else if(req.showDir) {
          // In this case, we were probably attempting to autoindex with
          // 'index.html' and it didn't work. This should prompt the
          // "showdir" function, which should've been set to `next`.
          // TODO: Re-evaluate this dependence on recursion. Could the confusion
          // introduced be eliminated?
          // TODO: We're attaching this random property to req to make it work,
          // which is BAD FORM. This *needs* a refactor but I think making it
          // not broken is the lesser of two evils.
          // NOTE: Alternate check here was:
          // `path.basename(req.url) === 'index.html' && autoIndex
          next();
        }
        else {
          // Try for ./404.html
          middleware({
            url: '/404.html',
            statusCode: 404 // Override the response status code
          }, res, next);
        }
      }
      else if (err) {
        status[500](res, next, { error: err });
      }
      else if (stat.isDirectory()) {

        // retry for the index.html, if that's not there fall back to the
        // directory view (if activated)
        var handler = (typeof next === 'function' && !autoIndex)
              ? next
              : function () {
                showDir(root, pathname, stat, cache)(req, res);
              };

        middleware({
          url: path.join(pathname, '/index.html'),
          showDir: true
        }, res, handler);
      }
      else {

        // TODO: Helper for this, with default headers.
        res.setHeader('etag', etag(stat));
        res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString());
        res.setHeader('cache-control', 'max-age='+cache);

        // Return a 304 if necessary
        if ( req.headers
          && ( (req.headers['if-none-match'] === etag(stat))
            || (Date.parse(req.headers['if-none-match']) >= stat.mtime )
          )
        ) {
          status[304](res, next);
        }
        else {

          res.setHeader(
            'content-type',
            mime.lookup(file) || 'application/octet-stream'
          );

          if (req.method === "HEAD") {
            res.statusCode = req.statusCode || 200; // overridden for 404's
            res.end();
          }
          else {

            var stream = fs.createReadStream(file);

            stream.pipe(res);
            stream.on('error', function (err) {
              status['500'](res, next, { error: err });
            });

            stream.on('end', function () {
              res.statusCode = 200;
              res.end();
            });
          }
        }
      }
    });
  };
};

ecstatic.version = version;
ecstatic.showDir = showDir;

