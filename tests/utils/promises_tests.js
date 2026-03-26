const { expect } = require('chai');
const { fromCallback, filter, reduce, each } = require('../../lib/utils/promises');

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
