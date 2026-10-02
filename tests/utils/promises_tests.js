import { expect } from "chai";
import { setTimeout as delay } from "node:timers/promises";
import { using, mapLimit, retry } from "../../lib/utils/promises.js";

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

  it('runs all items in parallel when concurrency is NaN', async function() {
    const order = [];
    const result = await mapLimit([1, 2, 3], NaN, async x => {
      order.push(`start:${x}`);
      await Promise.resolve();
      return x;
    });
    expect(order).to.deep.equal(['start:1', 'start:2', 'start:3']);
    expect(result).to.deep.equal([1, 2, 3]);
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
    } catch { /* ignore */ }
    expect(calls).to.equal(4);
  });

  it('defaults to 3 max_tries', async function() {
    let calls = 0;
    try {
      await retry(() => { calls++; throw new Error('fail'); });
    } catch { /* ignore */ }
    expect(calls).to.equal(3);
  });

  it('waits interval between failed attempts when provided', async function() {
    let calls = 0;
    const start = Date.now();
    try {
      await retry(() => { calls++; throw new Error('fail'); }, { max_tries: 3, interval: 20 });
    } catch { /* ignore */ }
    expect(calls).to.equal(3);
    expect(Date.now() - start).to.be.at.least(40);
  });

  it('applies backoff to the wait between failed attempts', async function() {
    let calls = 0;
    const start = Date.now();
    try {
      await retry(() => { calls++; throw new Error('fail'); }, { max_tries: 3, interval: 20, backoff: 2 });
    } catch { /* ignore */ }
    expect(calls).to.equal(3);
    expect(Date.now() - start).to.be.at.least(60);
  });

  it('does not wait when the first attempt succeeds', async function() {
    const start = Date.now();
    const result = await retry(() => Promise.resolve('ok'), { max_tries: 3, interval: 50 });
    expect(result).to.equal('ok');
    expect(Date.now() - start).to.be.below(40);
  });
});

describe('using', function() {
  it('returns the value from run', async function() {
    const result = await using(() => 42, () => {});
    expect(result).to.equal(42);
  });

  it('returns the value from run when dispose is async', async function() {
    const result = await using(
      async () => 'ok',
      async () => {
        await Promise.resolve();
      },
    );
    expect(result).to.equal('ok');
  });

  it('ignores the value returned by dispose', async function() {
    const result = await using(() => 'run', () => 'dispose');
    expect(result).to.equal('run');
  });

  it('calls dispose after run succeeds', async function() {
    const order = [];
    await using(
      () => {
        order.push('run');
      },
      () => {
        order.push('dispose');
      },
    );
    expect(order).to.deep.equal(['run', 'dispose']);
  });

  it('calls dispose with undefined when run succeeds', async function() {
    let received;
    await using(() => 'ok', (err) => {
      received = err;
    });
    expect(received).to.equal(undefined);
  });

  it('calls dispose after run rejects and rethrows that error', async function() {
    const err = new Error('run failed');
    const order = [];
    let received;

    try {
      await using(
        () => {
          order.push('run');
          throw err;
        },
        (error) => {
          order.push('dispose');
          received = error;
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      order.push('caught');
      expect(e).to.equal(err);
    }

    expect(received).to.equal(err);
    expect(order).to.deep.equal(['run', 'dispose', 'caught']);
  });

  it('calls dispose once when run rejects', async function() {
    let calls = 0;
    try {
      await using(
        () => {
          throw new Error('run failed');
        },
        () => {
          calls++;
        },
      );
    } catch {
      /* expected */
    }
    expect(calls).to.equal(1);
  });

  it('awaits an async dispose before rethrowing the run error', async function() {
    const err = new Error('run failed');
    let disposed = false;

    try {
      await using(
        () => {
          throw err;
        },
        async () => {
          await Promise.resolve();
          disposed = true;
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(err);
    }

    expect(disposed).to.equal(true);
  });

  it('rejects with the dispose error when run succeeds', async function() {
    const cleanupErr = new Error('cleanup failed');
    try {
      await using(() => 'ok', () => {
        throw cleanupErr;
      });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(cleanupErr);
    }
  });

  it('rejects with an async dispose error when run succeeds', async function() {
    const cleanupErr = new Error('cleanup failed');
    try {
      await using(() => 'ok', async () => {
        await Promise.resolve();
        throw cleanupErr;
      });
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(cleanupErr);
    }
  });

  it('keeps the run error when dispose also fails', async function() {
    const originalErr = new Error('original');
    try {
      await using(
        () => {
          throw originalErr;
        },
        () => {
          throw new Error('cleanup also failed');
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(originalErr);
    }
  });

  it('keeps the run error when an async dispose also fails', async function() {
    const originalErr = new Error('original');
    try {
      await using(
        () => {
          throw originalErr;
        },
        async () => {
          await Promise.resolve();
          throw new Error('cleanup also failed');
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(originalErr);
    }
  });

  it('keeps a falsy run rejection when dispose also fails', async function() {
    try {
      await using(
        () => {
          throw undefined;
        },
        () => {
          throw new Error('cleanup also failed');
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(undefined);
    }
  });

  it('keeps the first error across nested cleanups', async function() {
    const originalErr = new Error('original');
    const order = [];

    try {
      await using(
        () =>
          using(
            () => {
              throw originalErr;
            },
            () => {
              order.push('inner');
              throw new Error('inner cleanup');
            },
          ),
        () => {
          order.push('outer');
          throw new Error('outer cleanup');
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(originalErr);
    }

    expect(order).to.deep.equal(['inner', 'outer']);
  });

  it('keeps the first cleanup error when run succeeds and a later cleanup fails', async function() {
    const innerErr = new Error('inner cleanup');
    const order = [];

    try {
      await using(
        () =>
          using(
            () => 'ok',
            () => {
              order.push('inner');
              throw innerErr;
            },
          ),
        () => {
          order.push('outer');
          throw new Error('outer cleanup');
        },
      );
      throw new Error('expected rejection');
    } catch (e) {
      expect(e).to.equal(innerErr);
    }

    expect(order).to.deep.equal(['inner', 'outer']);
  });
});
