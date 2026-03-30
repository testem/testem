const { expect } = require('chai');
const EventEmitter = require('events');

const TapConsumer = require('../lib/tap_consumer');
const BrowserTapConsumer = require('../lib/browser_tap_consumer');

function collectTapResults(consumer, tapText) {
  return new Promise((resolve, reject) => {
    const results = [];
    consumer.on('test-result', r => results.push(r));
    consumer.once('all-test-results', () => resolve(results));
    consumer.once('error', reject);
    consumer.stream.end(tapText);
  });
}

function collectBrowserTapResults(socket, tapLines) {
  const consumer = new BrowserTapConsumer(socket);
  return new Promise((resolve, reject) => {
    const results = [];
    consumer.on('test-result', r => results.push(r));
    consumer.once('all-test-results', () => resolve(results));
    consumer.once('error', reject);
    tapLines.forEach(line => socket.emit('tap', line));
    socket.emit('tap', '# ok');
  });
}

describe('TapConsumer', function() {
  it('emits a test-result for a passing assertion', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'ok 1 works',
      '1..1',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      expect(results[0]).to.deep.include({
        passed: 1,
        failed: 0,
        total: 1,
        id: 1,
        name: 'works',
        items: []
      });
    });
  });

  it('emits a test-result for a failing assertion without YAML diagnostics', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'not ok 1 oops',
      '1..1',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      expect(results[0]).to.deep.include({
        passed: 0,
        failed: 1,
        total: 1,
        id: 1,
        name: 'oops'
      });
      expect(results[0].items).to.have.length(1);
      expect(results[0].items[0]).to.deep.include({
        ok: false,
        id: 1,
        name: 'oops',
        passed: false
      });
    });
  });

  it('appends parser `extra` lines after a failed assertion onto the failure stack (onTapExtra)', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      '1..1',
      'not ok 1 broken',
      '  ReferenceError: something failed',
      '      at foo (bar.js:2:2)',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      const stack = results[0].items[0].stack;
      expect(stack).to.be.a('string');
      expect(stack).to.include('ReferenceError: something failed');
      expect(stack).to.include('bar.js:2:2');
    });
  });

  it('appends parser `extra` lines after YAML when stack already exists (onTapExtra)', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      '1..1',
      'not ok 1 hello',
      '  ---',
      '    at: "Test._cb (file.js:1:1)"',
      '  ...',
      '  trailing-after-yaml',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      const stack = results[0].items[0].stack;
      expect(stack).to.be.a('string');
      expect(stack).to.include('file.js:1:1');
      expect(stack).to.include('trailing-after-yaml');
    });
  });

  it('includes YAML `at` diagnostic on the failed item stack when present', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'not ok 1 hello',
      '  ---',
      '    at: "Test._cb (file.js:1:1)"',
      '  ...',
      '1..1',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      expect(results[0].failed).to.equal(1);
      expect(results[0].items[0].stack).to.be.a('string');
      expect(results[0].items[0].stack).to.include('file.js:1:1');
    });
  });

  it('emits one test-result per assertion in order', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'ok 1 first',
      'not ok 2 second',
      'ok 3 third',
      '1..3',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(3);
      expect(results[0]).to.deep.include({ id: 1, name: 'first', passed: 1, failed: 0 });
      expect(results[1]).to.deep.include({ id: 2, name: 'second', passed: 0, failed: 1 });
      expect(results[2]).to.deep.include({ id: 3, name: 'third', passed: 1, failed: 0 });
    });
  });

  it('emits a bailout test-result and all-test-results when the stream bails out', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'not ok 1 fail',
      'Bail out! nope',
      ''
    ].join('\n');
    return new Promise((resolve, reject) => {
      const results = [];
      let allDone = 0;
      consumer.on('test-result', r => results.push(r));
      consumer.once('error', reject);
      consumer.on('all-test-results', () => {
        allDone++;
        if (allDone !== 1) {
          reject(new Error(`expected one all-test-results, got ${allDone}`));
          return;
        }
        try {
          expect(results).to.have.length(2);
          expect(results[0]).to.deep.include({
            failed: 1,
            id: 1,
            name: 'fail'
          });
          expect(results[1]).to.deep.include({
            failed: 1,
            name: 'bailout'
          });
          expect(results[1].error).to.deep.include({ message: 'nope' });
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      consumer.stream.end(tap);
    });
  });

  it('fires all-test-results exactly once on a normal complete stream', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'ok 1 only',
      '1..1',
      ''
    ].join('\n');
    return new Promise((resolve, reject) => {
      let allDone = 0;
      consumer.once('error', reject);
      consumer.on('all-test-results', () => {
        allDone++;
        try {
          expect(allDone).to.equal(1);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      consumer.stream.end(tap);
    });
  });

  describe('nested TAP (desired behavior)', function() {
    // tap-parser emits `child` parsers; nested asserts do not surface on the root
    // stream until TapConsumer subscribes to them. These tests document the
    // intended contract: one test-result per assert, names as `subtest > name`.
    it('emits one test-result per assertion at every nesting depth', function() {
      const consumer = new TapConsumer();
      const tap = [
        'TAP version 13',
        '1..2',
        'ok 1 parent first',
        '    # Subtest: child',
        '    ok 1 child test',
        '    1..1',
        'ok 2 parent last',
        ''
      ].join('\n');
      return collectTapResults(consumer, tap).then(results => {
        expect(results).to.have.length(3);
        expect(results[0]).to.deep.include({
          id: 1,
          name: 'parent first',
          passed: 1,
          failed: 0
        });
        expect(results[1]).to.deep.include({
          id: 1,
          name: 'child > child test',
          passed: 1,
          failed: 0,
          items: []
        });
        expect(results[2]).to.deep.include({
          id: 2,
          name: 'parent last',
          passed: 1,
          failed: 0
        });
      });
    });

    it('reports a failing assertion inside a subtest with a qualified name', function() {
      const consumer = new TapConsumer();
      const tap = [
        'TAP version 13',
        '1..1',
        'ok 1 wrapper',
        '    # Subtest: inner',
        '    not ok 1 inner fail',
        '    1..1',
        ''
      ].join('\n');
      return collectTapResults(consumer, tap).then(results => {
        expect(results).to.have.length(2);
        expect(results[0]).to.deep.include({
          id: 1,
          name: 'wrapper',
          passed: 1,
          failed: 0
        });
        expect(results[1]).to.deep.include({
          id: 1,
          name: 'inner > inner fail',
          passed: 0,
          failed: 1
        });
        expect(results[1].todo).to.equal(undefined);
        expect(results[1].items).to.have.length(1);
      });
    });

    it('propagates skip and todo from nested assertions', function() {
      const consumer = new TapConsumer();
      const tap = [
        'TAP version 13',
        '1..1',
        'ok 1 outer',
        '    # Subtest: nest',
        '    ok 1 skipme # SKIP',
        '    not ok 2 bad # TODO later',
        '    ok 3 fut # TODO',
        '    1..3',
        ''
      ].join('\n');
      return collectTapResults(consumer, tap).then(results => {
        expect(results).to.have.length(4);
        expect(results[0].name).to.equal('outer');
        expect(results[1]).to.deep.include({
          name: 'nest > skipme',
          skipped: true,
          passed: 0,
          failed: 0
        });
        expect(results[2]).to.deep.include({
          name: 'nest > bad',
          todo: true,
          failed: 1
        });
        expect(results[3]).to.deep.include({
          name: 'nest > fut',
          todo: true,
          passed: 1,
          failed: 0
        });
      });
    });

    it('nested bailout: inner failure is qualified, then bailout test-result with reason', function() {
      const consumer = new TapConsumer();
      const tap = [
        'TAP version 13',
        '1..1',
        'ok 1 outer',
        '    # Subtest: inner',
        '    not ok 1 bad',
        '    Bail out! inner reason',
        ''
      ].join('\n');
      return new Promise((resolve, reject) => {
        const results = [];
        let allDone = 0;
        consumer.on('test-result', r => results.push(r));
        consumer.once('error', reject);
        consumer.on('all-test-results', () => {
          allDone++;
          try {
            expect(allDone).to.equal(1);
            expect(results).to.have.length(3);
            expect(results[0]).to.deep.include({
              name: 'outer',
              passed: 1,
              failed: 0
            });
            expect(results[1]).to.deep.include({
              name: 'inner > bad',
              passed: 0,
              failed: 1
            });
            expect(results[2]).to.deep.include({
              name: 'bailout',
              failed: 1
            });
            expect(results[2].error).to.deep.include({ message: 'inner reason' });
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        consumer.stream.end(tap);
      });
    });

    it('sibling subtests: two root tests each open their own subtest block', function() {
      const consumer = new TapConsumer();
      const tap = [
        'TAP version 13',
        '1..2',
        'ok 1 block-a',
        '    # Subtest: s1',
        '    ok 1 x',
        '    1..1',
        'ok 2 block-b',
        '    # Subtest: s2',
        '    ok 1 y',
        '    1..1',
        ''
      ].join('\n');
      return collectTapResults(consumer, tap).then(results => {
        expect(results).to.have.length(4);
        expect(results[0].name).to.equal('block-a');
        expect(results[1]).to.deep.include({
          name: 's1 > x',
          passed: 1,
          failed: 0,
          items: []
        });
        expect(results[2].name).to.equal('block-b');
        expect(results[3]).to.deep.include({
          name: 's2 > y',
          passed: 1,
          failed: 0,
          items: []
        });
      });
    });
  });

  describe('TAP version 14', function() {
    it('parses streams like version 13 (pass, fail, skip, failing todo, passing todo)', function() {
      const consumer = new TapConsumer();
      const tap = [
        'TAP version 14',
        'ok 1 first',
        'not ok 2 second',
        'ok 3 skipme # SKIP',
        'not ok 4 bad # TODO t',
        'ok 5 future # TODO',
        '1..5',
        ''
      ].join('\n');
      return collectTapResults(consumer, tap).then(results => {
        expect(results).to.have.length(5);

        expect(results[0]).to.deep.include({
          id: 1,
          name: 'first',
          passed: 1,
          failed: 0,
          items: []
        });

        expect(results[1]).to.deep.include({
          id: 2,
          name: 'second',
          passed: 0,
          failed: 1
        });
        expect(results[1].todo).to.equal(undefined);
        expect(results[1].items).to.have.length(1);

        expect(results[2]).to.deep.include({
          id: 3,
          name: 'skipme',
          skipped: true,
          passed: 0,
          failed: 0,
          items: []
        });

        expect(results[3]).to.deep.include({
          id: 4,
          name: 'bad',
          todo: true,
          passed: 0,
          failed: 1
        });
        expect(results[3].items).to.have.length(1);

        expect(results[4]).to.deep.include({
          id: 5,
          name: 'future',
          todo: true,
          passed: 1,
          failed: 0,
          items: []
        });
      });
    });
  });

  it('emits test-result with skipped: true for # SKIP directives (not silence them)', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'ok 1 only # SKIP reason',
      '1..1',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      expect(results[0]).to.deep.include({
        passed: 0,
        failed: 0,
        total: 1,
        id: 1,
        name: 'only',
        skipped: true,
        items: []
      });
    });
  });

  it('emits test-result with todo: true for failing TODO assertions', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'not ok 1 bad # TODO fix later',
      '1..1',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      expect(results[0]).to.deep.include({
        passed: 0,
        failed: 1,
        total: 1,
        id: 1,
        name: 'bad',
        todo: true
      });
      expect(results[0].items).to.have.length(1);
      expect(results[0].items[0].passed).to.equal(false);
    });
  });

  it('emits test-result with todo: true for passing TODO assertions', function() {
    const consumer = new TapConsumer();
    const tap = [
      'TAP version 13',
      'ok 1 future # TODO',
      '1..1',
      ''
    ].join('\n');
    return collectTapResults(consumer, tap).then(results => {
      expect(results).to.have.length(1);
      expect(results[0]).to.deep.include({
        passed: 1,
        failed: 0,
        total: 1,
        id: 1,
        name: 'future',
        todo: true,
        items: []
      });
    });
  });
});

describe('BrowserTapConsumer', function() {
  it('forwards TAP from socket lines and emits the same skip/todo semantics as TapConsumer', function() {
    const socket = new EventEmitter();
    const lines = [
      'TAP version 13',
      'ok 1 only # SKIP reason',
      'not ok 2 bad # TODO fix later',
      'ok 3 future # TODO',
      '1..3',
      ''
    ];
    return collectBrowserTapResults(socket, lines).then(results => {
      expect(results).to.have.length(3);

      expect(results[0]).to.deep.include({
        passed: 0,
        failed: 0,
        id: 1,
        name: 'only',
        skipped: true
      });

      expect(results[1]).to.deep.include({
        passed: 0,
        failed: 1,
        id: 2,
        name: 'bad',
        todo: true
      });
      expect(results[1].items).to.have.length(1);

      expect(results[2]).to.deep.include({
        passed: 1,
        failed: 0,
        id: 3,
        name: 'future',
        todo: true,
        items: []
      });
    });
  });

  describe('TAP version 14', function() {
    it('forwards the same stream shape through the socket adapter', function() {
      const socket = new EventEmitter();
      const lines = [
        'TAP version 14',
        'ok 1 first',
        'not ok 2 second',
        'ok 3 skipme # SKIP',
        'not ok 4 bad # TODO t',
        'ok 5 future # TODO',
        '1..5',
        ''
      ];
      return collectBrowserTapResults(socket, lines).then(results => {
        expect(results).to.have.length(5);
        expect(results[2].skipped).to.equal(true);
        expect(results[3].todo).to.equal(true);
        expect(results[3].failed).to.equal(1);
        expect(results[4].todo).to.equal(true);
        expect(results[4].passed).to.equal(1);
      });
    });
  });

  describe('nested TAP (browser)', function() {
    it('forwards nested subtest TAP through the socket adapter like TapConsumer', function() {
      const socket = new EventEmitter();
      const lines = [
        'TAP version 13',
        '1..2',
        'ok 1 parent first',
        '    # Subtest: child',
        '    ok 1 child test',
        '    1..1',
        'ok 2 parent last',
        ''
      ];
      return collectBrowserTapResults(socket, lines).then(results => {
        expect(results).to.have.length(3);
        expect(results[0].name).to.equal('parent first');
        expect(results[1]).to.deep.include({
          name: 'child > child test',
          passed: 1,
          failed: 0
        });
        expect(results[2].name).to.equal('parent last');
      });
    });

    it('forwards nested bailout TAP through the socket adapter', function() {
      const socket = new EventEmitter();
      const lines = [
        'TAP version 13',
        '1..1',
        'ok 1 outer',
        '    # Subtest: inner',
        '    not ok 1 bad',
        '    Bail out! inner reason',
        ''
      ];
      return new Promise((resolve, reject) => {
        const consumer = new BrowserTapConsumer(socket);
        const results = [];
        let allDone = 0;
        consumer.on('test-result', r => results.push(r));
        consumer.once('error', reject);
        consumer.on('all-test-results', () => {
          allDone++;
          try {
            expect(allDone).to.equal(1);
            expect(results).to.have.length(3);
            expect(results[2].error).to.deep.include({ message: 'inner reason' });
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        lines.forEach(line => socket.emit('tap', line));
        socket.emit('tap', '# ok');
      });
    });
  });
});
