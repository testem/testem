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

module.exports = { fromCallback, filter, reduce, each };
