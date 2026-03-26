function fromCallback(fn) {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

async function filter(arr, predicate) {
  const results = await Promise.all(arr.map(item => predicate(item)));
  return arr.filter((_, i) => results[i]);
}

function reduce(arr, reducer, initialValue) {
  return arr.reduce(
    (acc, item) => acc.then(a => reducer(a, item)),
    Promise.resolve(initialValue)
  );
}

function each(arr, fn) {
  return arr.reduce(
    (p, item) => p.then(() => fn(item)),
    Promise.resolve()
  ).then(() => arr);
}

class Disposer {
  constructor(promise, cleanup) {
    this.promise = Promise.resolve(promise);
    this.cleanup = cleanup;
  }
}

function disposer(promise, cleanup) {
  return new Disposer(promise, cleanup);
}

async function using(resource, fn) {
  const isDisposer = resource instanceof Disposer;
  const value = await (isDisposer ? resource.promise : resource);

  let result, rejected = false, error;

  try {
    result = await fn(value);
  } catch (err) {
    rejected = true;
    error = err;
  }

  if (isDisposer) {
    const inspection = {
      isRejected: () => rejected,
      reason: () => error,
    };

    try {
      await resource.cleanup(value, inspection);
    } catch (cleanupErr) {
      if (!rejected) {
        // Callback succeeded but cleanup failed — surface cleanup error
        throw cleanupErr;
      }
      // Both callback and cleanup failed — suppress cleanup error, re-throw original below
    }
  }

  if (rejected) {
    throw error;
  }
  return result;
}

function mapLimit(arr, concurrency, fn) {
  if (!isFinite(concurrency) || concurrency >= arr.length) {
    return Promise.all(arr.map(fn));
  }

  let index = 0;
  let results = new Array(arr.length);

  function next() {
    let i = index++;
    if (i >= arr.length) {
      return Promise.resolve();
    }

    return Promise.resolve(fn(arr[i])).then(result => {
      results[i] = result;
      return next();
    });
  }

  let workers = [];
  for (let w = 0; w < Math.min(concurrency, arr.length); w++) {
    workers.push(next());
  }

  return Promise.all(workers).then(() => results);
}

async function retry(fn, { max_tries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < max_tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

module.exports = { fromCallback, filter, reduce, each, mapLimit, retry, Disposer, disposer, using };
