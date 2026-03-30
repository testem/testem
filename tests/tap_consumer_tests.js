'use strict';

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
          expect(results[1].error).to.deep.equal({ message: 'nope' });
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
});
