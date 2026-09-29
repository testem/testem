const { setTimeout: delay } = require('timers/promises');

async function mapLimit(arr, concurrency, fn) {
  let results = new Array(arr.length);
  let index = 0;

  async function worker() {
    while (index < arr.length) {
      let i = index++;
      results[i] = await fn(arr[i]);
    }
  }

  let workerCount = isFinite(concurrency) ? Math.min(concurrency, arr.length) : arr.length;
  let workers = [];
  for (let w = 0; w < workerCount; w++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  return results;
}

async function retry(fn, { max_tries = 3, interval = 0, backoff = 1 } = {}) {
  let lastErr;
  let wait = interval;
  for (let i = 0; i < max_tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < max_tries - 1 && wait > 0) {
        await delay(wait);
        wait *= backoff;
      }
    }
  }
  throw lastErr;
}

module.exports = { mapLimit, retry };
