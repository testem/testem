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

module.exports = { fromCallback, filter, reduce, each, Disposer, disposer, using };
