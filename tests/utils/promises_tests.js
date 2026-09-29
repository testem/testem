const { expect } = require('chai');
const { setTimeout: delay } = require('timers/promises');
const { mapLimit, retry } = require('../../lib/utils/promises');

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
