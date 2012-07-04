exports['304'] = function (res, next) {
  res.writeHead(304, res.headers);
  res.end();
};

exports['403'] = function (res, next) {
  if (typeof next === "function") {
    next();
  }
  else {
    if (res.writable) {
      res.setHeader('content-type', 'text/plain');
      res.writeHead(403, res.headers);
      res.end('ACCESS DENIED');
    }
  }
};

exports['405'] = function (res, next, opts) {
  if (typeof next === "function") {
    next();
  }
  else {
    res.setHeader('allow', (opts && opts.allow) || 'GET, HEAD');
    res.writeHead(405, res.headers);
    res.end();    
  }
};

exports['404'] = function (res, next) {
  if (typeof next === "function") {
    next();
  }
  else {
    if (res.writable) {
      res.setHeader('content-type', 'text/plain');
      res.writeHead(404, res.headers);
      res.end('File not found. :(');
    }
  }
};

exports['500'] = function (res, next, opts) {
  // TODO: Return nicer messages
  res.writeHead(500, res.headers);
  res.end(opts.error.stack || opts.error.toString() || "No specified error");
};
