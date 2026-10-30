import { expect } from "chai";
import { Collection, Model } from "../../lib/reporters/dev/model.js";
import Runner from "../../lib/reporters/dev/runner.js";
import TestResults from "../../lib/reporters/dev/test_results.js";

describe('Model', function () {
  it('returns constructor attributes and undefined for a missing key', function () {
    const model = new Model({ name: 'Bob' });
    expect(model.get('name')).to.equal('Bob');
    expect(model.get('age')).to.equal(undefined);
  });

  it('emits change:key then one change', function () {
    const model = new Model();
    const seen = [];
    model.on('change:name', (source, value, options) => {
      seen.push(['change:name', source, value, options]);
    });
    model.on('change', (source, options) => {
      seen.push(['change', source, options]);
    });
    model.set('name', 'Bob', { silent: false });
    expect(seen.map(entry => entry[0])).to.deep.equal(['change:name', 'change']);
    expect(seen[0][1]).to.equal(model);
    expect(seen[0][2]).to.equal('Bob');
    expect(seen[0][3]).to.deep.equal({ silent: false });
    expect(seen[1][1]).to.equal(model);
    expect(seen[1][2]).to.deep.equal({ silent: false });
  });

  it('emits one change for a multi-key set', function () {
    const model = new Model();
    const seen = [];
    model.on('change:passed', () => seen.push('passed'));
    model.on('change:total', () => seen.push('total'));
    model.on('change', () => seen.push('change'));
    model.set({ passed: 1, total: 2 });
    expect(seen).to.deep.equal(['passed', 'total', 'change']);
  });

  it('does not emit when the value is unchanged', function () {
    const model = new Model({ allPassed: true });
    let emitted = 0;
    model.on('change:allPassed', () => {
      emitted++;
    });
    model.on('change', () => {
      emitted++;
    });
    model.set('allPassed', true);
    expect(emitted).to.equal(0);
    expect(model.get('allPassed')).to.equal(true);
  });

  it('does not emit a change when every key in a multi-key set is unchanged', function () {
    const model = new Model({ passed: 1, total: 1 });
    let emitted = 0;
    model.on('change', () => {
      emitted++;
    });
    model.set({ passed: 1, total: 1 });
    expect(emitted).to.equal(0);
  });

  it('updates without events when silent', function () {
    const model = new Model({ cols: 80, lines: 24 });
    let emitted = 0;
    model.on('change:cols change:lines', () => {
      emitted++;
    });
    model.on('change', () => {
      emitted++;
    });
    model.set({ cols: 100, lines: 40 }, { silent: true });
    expect(model.get('cols')).to.equal(100);
    expect(model.get('lines')).to.equal(40);
    expect(emitted).to.equal(0);
  });

  it('emits when a flag changes to undefined and not when it stays undefined', function () {
    const model = new Model({ flag: true });
    let emitted = 0;
    model.on('change:flag', () => {
      emitted++;
    });
    model.set('flag', undefined);
    expect(model.get('flag')).to.equal(undefined);
    expect(emitted).to.equal(1);
    model.set('flag', undefined);
    expect(emitted).to.equal(1);
  });

  it('registers and removes a space-separated subscription as one string', function () {
    const model = new Model();
    const seen = [];
    const onResize = (source, value) => {
      seen.push(value);
    };
    model.on('change:lines change:cols', onResize);
    model.set('lines', 30);
    model.set('cols', 90);
    expect(seen).to.deep.equal([30, 90]);
    model.off('change:lines change:cols', onResize);
    model.set({ lines: 20, cols: 80 });
    expect(seen).to.deep.equal([30, 90]);
  });

  it('runs once only once', function () {
    const model = new Model();
    let calls = 0;
    model.once('tests-end', () => {
      calls++;
    });
    model.trigger('tests-end');
    model.trigger('tests-end');
    expect(calls).to.equal(1);
  });

  it('removes one callback and leaves another on the same event', function () {
    const model = new Model();
    let first = 0;
    let second = 0;
    const onFirst = () => {
      first++;
    };
    const onSecond = () => {
      second++;
    };
    model.on('change:name', onFirst);
    model.on('change:name', onSecond);
    model.off('change:name', onFirst);
    model.set('name', 'Ada');
    expect(first).to.equal(0);
    expect(second).to.equal(1);
  });

  it('delivers custom event payloads without emitting change', function () {
    const model = new Model();
    let payload;
    let changes = 0;
    model.on('tests-end', (value) => {
      payload = value;
    });
    model.on('change', () => {
      changes++;
    });
    model.trigger('tests-end', { passed: 3 });
    expect(payload).to.deep.equal({ passed: 3 });
    expect(changes).to.equal(0);
  });
});

describe('Collection', function () {
  it('wraps plain objects, keeps models, and does not emit add during construction', function () {
    const existing = new Model({ name: 'kept' });
    let added = 0;
    const collection = new Collection([{ name: 'plain' }, existing]);
    collection.on('add', () => {
      added++;
    });
    expect(collection.length).to.equal(2);
    expect(collection.at(0)).to.be.instanceOf(Model);
    expect(collection.at(0)).not.to.equal(existing);
    expect(collection.at(0).get('name')).to.equal('plain');
    expect(collection.at(1)).to.equal(existing);
    expect(added).to.equal(0);
  });

  it('wraps a pushed plain object and keeps a pushed model', function () {
    const collection = new Collection();
    const added = [];
    collection.on('add', (model) => added.push(model));
    const wrapped = collection.push({ text: 'hello' });
    const existing = new Model({ text: 'there' });
    collection.push(existing);
    expect(wrapped).to.be.instanceOf(Model);
    expect(collection.at(0).get('text')).to.equal('hello');
    expect(collection.at(1)).to.equal(existing);
    expect(added).to.deep.equal([wrapped, existing]);
  });

  it('emits remove with the model and ignores an absent model', function () {
    const model = new Model({ name: 'tab' });
    const other = new Model({ name: 'other' });
    const collection = new Collection([model]);
    const removed = [];
    collection.on('remove', (item) => removed.push(item));
    collection.remove(model);
    expect(collection.length).to.equal(0);
    expect(collection.at(0)).to.equal(undefined);
    collection.remove(other);
    collection.remove(undefined);
    expect(removed).to.deep.equal([model]);
  });

  it('reset empties and emits reset without add or remove', function () {
    const collection = new Collection([{ name: 'a' }]);
    const seen = [];
    collection.on('reset', () => seen.push('reset'));
    collection.on('add', () => seen.push('add'));
    collection.on('remove', () => seen.push('remove'));
    collection.reset();
    expect(collection.length).to.equal(0);
    expect(seen).to.deep.equal(['reset']);
  });

  it('filter and map return arrays and forEach visits in order', function () {
    const collection = new Collection([
      { type: 'log', text: 'hello' },
      { type: 'error', text: 'boom' }
    ]);
    const types = [];
    collection.forEach((model) => types.push(model.get('type')));
    const errors = collection.filter((model) => model.get('type') === 'error');
    const texts = collection.map((model) => model.get('text'));
    expect(types).to.deep.equal(['log', 'error']);
    expect(Array.isArray(errors)).to.equal(true);
    expect(errors.map((model) => model.get('text'))).to.deep.equal(['boom']);
    expect(texts).to.deep.equal(['hello', 'boom']);
  });

  it('wraps plain objects with the configured model class', function () {
    class Entry extends Model {}
    const collection = new Collection([], { model: Entry });
    collection.push({ text: 'hi' });
    expect(collection.at(0)).to.be.instanceOf(Entry);
  });
});

describe('Runner', function () {
  function launcher() {
    return {
      name() {
        return 'Chrome';
      },
      extra: 1
    };
  }

  it('stores the launcher without copying its other fields', function () {
    const browser = launcher();
    const runner = new Runner(browser);
    expect(runner.get('name')).to.equal('Chrome');
    expect(runner.get('runner')).to.equal(browser);
    expect(runner.get('extra')).to.equal(undefined);
    expect(runner.get('messages')).to.be.instanceOf(Collection);
    expect(runner.get('results')).to.be.instanceOf(TestResults);
  });

  it('resets on start and marks the run complete on end', function () {
    const runner = new Runner(launcher());
    runner.get('messages').push({ type: 'log', text: 'hi' });
    runner.report({ failed: 0 });
    runner.setPlanned(4);
    const seen = [];
    runner.on('tests-start', () => seen.push('start'));
    runner.on('tests-end', () => seen.push('end'));

    expect(runner.hasMessages()).to.equal(true);
    expect(runner.hasResults()).to.equal(true);

    runner.onStart();
    expect(runner.get('messages').length).to.equal(0);
    expect(runner.get('results').get('total')).to.equal(0);
    expect(runner.get('results').get('planned')).to.equal(0);
    expect(runner.get('allPassed')).to.equal(undefined);
    expect(runner.hasMessages()).to.equal(false);
    expect(runner.hasResults()).to.equal(false);

    runner.report({ failed: 1 });
    runner.get('messages').push({ type: 'error', text: 'boom' });
    expect(runner.hasResults()).to.equal(true);
    expect(runner.hasMessages()).to.equal(true);

    runner.onEnd();
    expect(runner.get('results').get('all')).to.equal(true);
    expect(seen).to.deep.equal(['start', 'end']);
  });
});
