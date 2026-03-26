const { expect } = require('chai');
const { fromCallback, filter, reduce, each, Disposer, disposer, using, mapLimit, retry, delay, asCallback } = require('../../lib/utils/promises');

describe('fromCallback', function() {
  it('resolves with the result when the callback is called without an error', async function() {
    const result = await fromCallback(done => done(null, 42));
    expect(result).to.equal(42);
  });

  it('rejects when the callback is called with an error', async function() {
    const err = new Error('oops');
    try {
      await fromCallback(done => done(err));
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });

  it('resolves with undefined when callback passes no result', async function() {
    const result = await fromCallback(done => done(null));
    expect(result).to.equal(undefined);
  });
});

describe('filter', function() {
  it('returns items for which the predicate resolves to true', async function() {
    const result = await filter([1, 2, 3, 4], x => Promise.resolve(x % 2 === 0));
    expect(result).to.deep.equal([2, 4]);
  });

  it('returns an empty array when no items match', async function() {
    const result = await filter([1, 3, 5], x => Promise.resolve(x % 2 === 0));
    expect(result).to.deep.equal([]);
  });

  it('returns all items when every item matches', async function() {
    const result = await filter([2, 4, 6], x => Promise.resolve(x % 2 === 0));
    expect(result).to.deep.equal([2, 4, 6]);
  });

  it('handles an empty array', async function() {
    const result = await filter([], () => Promise.resolve(true));
    expect(result).to.deep.equal([]);
  });

  it('supports synchronous predicates that return a truthy value', async function() {
    const result = await filter(['a', '', 'b', ''], x => x);
    expect(result).to.deep.equal(['a', 'b']);
  });

  it('runs all predicates in parallel', async function() {
    const order = [];
    await filter([1, 2, 3], async x => {
      order.push(`start:${x}`);
      await Promise.resolve();
      order.push(`end:${x}`);
      return true;
    });
    // All starts should appear before any ends because predicates are launched together
    expect(order.slice(0, 3)).to.deep.equal(['start:1', 'start:2', 'start:3']);
  });
});

describe('reduce', function() {
  it('reduces an array to a single value', async function() {
    const result = await reduce([1, 2, 3, 4], (acc, x) => acc + x, 0);
    expect(result).to.equal(10);
  });

  it('resolves to the initial value for an empty array', async function() {
    const result = await reduce([], (acc, x) => acc + x, 99);
    expect(result).to.equal(99);
  });

  it('supports async reducers', async function() {
    const result = await reduce(
      [1, 2, 3],
      async (acc, x) => {
        await Promise.resolve();
        return acc * x;
      },
      1
    );
    expect(result).to.equal(6);
  });

  it('processes items sequentially', async function() {
    const order = [];
    await reduce(
      [1, 2, 3],
      async (acc, x) => {
        order.push(x);
        await Promise.resolve();
        return acc;
      },
      null
    );
    expect(order).to.deep.equal([1, 2, 3]);
  });
});

describe('each', function() {
  it('calls the function for each item in order', async function() {
    const visited = [];
    await each([1, 2, 3], x => visited.push(x));
    expect(visited).to.deep.equal([1, 2, 3]);
  });

  it('resolves to the original array', async function() {
    const arr = [1, 2, 3];
    const result = await each(arr, () => {});
    expect(result).to.equal(arr);
  });

  it('handles an empty array', async function() {
    const result = await each([], () => {
      throw new Error('should not be called');
    });
    expect(result).to.deep.equal([]);
  });

  it('processes items sequentially with async callbacks', async function() {
    const order = [];
    await each([1, 2, 3], async x => {
      order.push(`start:${x}`);
      await Promise.resolve();
      order.push(`end:${x}`);
    });
    expect(order).to.deep.equal([
      'start:1', 'end:1',
      'start:2', 'end:2',
      'start:3', 'end:3',
    ]);
  });

  it('rejects if any callback rejects', async function() {
    const err = new Error('fail');
    try {
      await each([1, 2, 3], x => {
        if (x === 2) { throw err; }
      });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });
});

describe('disposer', function() {
  it('creates a Disposer instance', function() {
    const d = disposer(Promise.resolve(1), () => {});
    expect(d).to.be.instanceOf(Disposer);
  });

  it('wraps a plain value in a resolved promise', async function() {
    const d = disposer(Promise.resolve('resource'), () => {});
    const value = await d.promise;
    expect(value).to.equal('resource');
  });
});

describe('using', function() {
  it('passes the resolved resource to the callback', async function() {
    const d = disposer(Promise.resolve(42), () => {});
    const result = await using(d, value => value * 2);
    expect(result).to.equal(84);
  });

  it('calls the cleanup function after the callback succeeds', async function() {
    let cleaned = false;
    const d = disposer(Promise.resolve('res'), () => { cleaned = true; });
    await using(d, () => {});
    expect(cleaned).to.equal(true);
  });

  it('calls the cleanup function after the callback rejects', async function() {
    let cleaned = false;
    const d = disposer(Promise.resolve('res'), () => { cleaned = true; });
    try {
      await using(d, () => { throw new Error('fail'); });
    } catch { /* expected */ }
    expect(cleaned).to.equal(true);
  });

  it('re-throws the callback error after cleanup', async function() {
    const err = new Error('callback error');
    const d = disposer(Promise.resolve('res'), () => {});
    try {
      await using(d, () => { throw err; });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });

  it('passes promise inspection to cleanup with isRejected()=false when callback succeeds', async function() {
    let inspection;
    const d = disposer(Promise.resolve('res'), (resource, p) => { inspection = p; });
    await using(d, () => {});
    expect(inspection.isRejected()).to.equal(false);
    expect(inspection.reason()).to.equal(undefined);
  });

  it('passes promise inspection to cleanup with isRejected()=true and reason() when callback fails', async function() {
    const err = new Error('oops');
    let inspection;
    const d = disposer(Promise.resolve('res'), (resource, p) => { inspection = p; });
    try {
      await using(d, () => { throw err; });
    } catch { /* expected */ }
    expect(inspection.isRejected()).to.equal(true);
    expect(inspection.reason()).to.equal(err);
  });

  it('passes the resource as the first argument to cleanup', async function() {
    let cleanedWith;
    const d = disposer(Promise.resolve('myResource'), (resource) => { cleanedWith = resource; });
    await using(d, () => {});
    expect(cleanedWith).to.equal('myResource');
  });

  it('surfaces cleanup errors when the callback succeeds', async function() {
    const cleanupErr = new Error('cleanup failed');
    const d = disposer(Promise.resolve('res'), () => { throw cleanupErr; });
    try {
      await using(d, () => {});
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(cleanupErr);
    }
  });

  it('suppresses cleanup errors when the callback already failed', async function() {
    const originalErr = new Error('original');
    const d = disposer(Promise.resolve('res'), () => { throw new Error('cleanup also failed'); });
    try {
      await using(d, () => { throw originalErr; });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(originalErr);
    }
  });

  it('supports async cleanup functions', async function() {
    let cleaned = false;
    const d = disposer(Promise.resolve('res'), async () => {
      await Promise.resolve();
      cleaned = true;
    });
    await using(d, () => {});
    expect(cleaned).to.equal(true);
  });

  it('works with a plain promise (no cleanup)', async function() {
    const result = await using(Promise.resolve('plain'), value => value + '!');
    expect(result).to.equal('plain!');
  });

  it('re-throws when using a plain promise and the callback fails', async function() {
    const err = new Error('plain fail');
    try {
      await using(Promise.resolve('plain'), () => { throw err; });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });
});

describe('mapLimit', function() {
  it('maps all items and returns results', async function() {
    const result = await mapLimit([1, 2, 3], Infinity, x => x * 2);
    expect(result).to.deep.equal([2, 4, 6]);
  });

  it('handles an empty array', async function() {
    const result = await mapLimit([], 2, () => { throw new Error('should not call'); });
    expect(result).to.deep.equal([]);
  });

  it('runs all items in parallel when concurrency exceeds array length', async function() {
    const order = [];
    await mapLimit([1, 2, 3], Infinity, async x => {
      order.push(`start:${x}`);
      await Promise.resolve();
      order.push(`end:${x}`);
      return x;
    });
    expect(order.slice(0, 3)).to.deep.equal(['start:1', 'start:2', 'start:3']);
  });

  it('limits concurrency to the given number', async function() {
    let active = 0;
    let maxActive = 0;
    const concurrency = 2;

    await mapLimit([1, 2, 3, 4, 5], concurrency, () => {
      active++;
      maxActive = Math.max(maxActive, active);
      return Promise.resolve().then(() => { active--; });
    });

    expect(maxActive).to.equal(concurrency);
  });

  it('preserves result order regardless of completion order', async function() {
    const delays = [30, 10, 20];
    const result = await mapLimit(delays, 3, ms =>
      delay(ms).then(() => ms)
    );
    expect(result).to.deep.equal([30, 10, 20]);
  });

  it('rejects if any mapper rejects', async function() {
    const err = new Error('map fail');
    try {
      await mapLimit([1, 2, 3], 2, x => {
        if (x === 2) { throw err; }
        return x;
      });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });
});

describe('retry', function() {
  it('resolves immediately when the function succeeds on the first try', async function() {
    const result = await retry(() => Promise.resolve(42));
    expect(result).to.equal(42);
  });

  it('retries and resolves when a later attempt succeeds', async function() {
    let calls = 0;
    const result = await retry(() => {
      calls++;
      if (calls < 3) { throw new Error('not yet'); }
      return Promise.resolve('ok');
    }, { max_tries: 3 });
    expect(result).to.equal('ok');
    expect(calls).to.equal(3);
  });

  it('rejects with the last error after all attempts are exhausted', async function() {
    const err = new Error('always fails');
    try {
      await retry(() => { throw err; }, { max_tries: 3 });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }
  });

  it('calls the function exactly max_tries times on total failure', async function() {
    let calls = 0;
    try {
      await retry(() => { calls++; throw new Error('fail'); }, { max_tries: 4 });
    } catch {}
    expect(calls).to.equal(4);
  });

  it('defaults to 3 max_tries', async function() {
    let calls = 0;
    try {
      await retry(() => { calls++; throw new Error('fail'); });
    } catch {}
    expect(calls).to.equal(3);
  });
});

describe('delay', function() {
  it('resolves after approximately the given number of milliseconds', async function() {
    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.at.least(40);
  });

  it('resolves with undefined', async function() {
    const result = await delay(0);
    expect(result).to.be.undefined();
  });

  it('resolves immediately for 0ms', async function() {
    const start = Date.now();
    await delay(0);
    expect(Date.now() - start).to.be.below(50);
  });
});

describe('asCallback', function() {
  it('calls cb with null and the result on fulfillment', function(done) {
    Promise.resolve(42).then(...asCallback(function(err, result) {
      expect(err).to.be.null();
      expect(result).to.equal(42);
      done();
    }));
  });

  it('calls cb with the error on rejection', function(done) {
    const err = new Error('oops');
    Promise.reject(err).then(...asCallback(function(e) {
      expect(e).to.equal(err);
      done();
    }));
  });

  it('does nothing when cb is null', function() {
    return Promise.resolve(1).then(...asCallback(null));
  });

  it('does nothing when cb is undefined', function() {
    return Promise.resolve(1).then(...asCallback(undefined));
  });
});

