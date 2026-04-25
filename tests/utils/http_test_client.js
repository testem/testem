const { fetch, Agent } = require('undici');

const insecureFetchAgent = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * @returns {Promise<{ res: { statusCode: number, headers: Record<string, string> }, text: string }>}
 */
async function httpRequest(urlOrOpts, maybeOpts) {
  let url;
  const opt = {};
  if (typeof urlOrOpts === 'string') {
    url = urlOrOpts;
    if (maybeOpts && typeof maybeOpts === 'object') {
      Object.assign(opt, maybeOpts);
    }
  } else {
    url = urlOrOpts.url;
    Object.assign(opt, urlOrOpts);
    delete opt.url;
  }
  const init = {
    method: opt.method || 'GET',
    headers: opt.headers,
    body: opt.body,
    redirect: opt.followRedirect === false ? 'manual' : 'follow',
  };
  if (opt.strictSSL === false) {
    init.dispatcher = insecureFetchAgent;
  }
  const response = await fetch(url, init);
  const text = await response.text();
  const headers = {};
  response.headers.forEach(function (v, k) {
    headers[k.toLowerCase()] = v;
  });
  return {
    res: { statusCode: response.status, headers },
    text,
  };
}

httpRequest.get = function (urlOrOpts, maybeOpts) {
  if (typeof urlOrOpts === 'string') {
    return httpRequest(urlOrOpts, { ...maybeOpts, method: 'GET' });
  }
  return httpRequest({ ...urlOrOpts, method: 'GET' });
};

httpRequest.post = function (urlOrOpts, maybeOpts) {
  if (typeof urlOrOpts === 'string') {
    return httpRequest(urlOrOpts, { ...maybeOpts, method: 'POST' });
  }
  return httpRequest({ ...urlOrOpts, method: 'POST' });
};

httpRequest.del = function (urlOrOpts, maybeOpts) {
  if (typeof urlOrOpts === 'string') {
    return httpRequest(urlOrOpts, { ...maybeOpts, method: 'DELETE' });
  }
  return httpRequest({ ...urlOrOpts, method: 'DELETE' });
};

function listenPromise(server, port) {
  return new Promise(function (resolve, reject) {
    server
      .listen(port, function () {
        resolve();
      })
      .on('error', reject);
  });
}

function closePromise(server) {
  return new Promise(function (resolve, reject) {
    server.close(function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  httpRequest,
  listenPromise,
  closePromise,
};
