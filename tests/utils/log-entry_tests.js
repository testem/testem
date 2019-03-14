'use strict';

const LogEntry = require('../../lib/utils/log-entry');
const expect = require('chai').expect;

describe('log-entry', function() {
  it('display correct output from toString() with no testContext', function() {
    const logEntry = new LogEntry('log', 'text');
    expect(logEntry.toString()).to.equal('LOG: text');
  });

  it('display correct output from toString() with testContext', function() {
    const testContext = {
      name: 'testName',
      state: 'complete'
    };
    const logEntry = new LogEntry('log', 'text', testContext);
    expect(logEntry.toString()).to.equal(`testContext: ${testContext}\nLOG: text`);
  });
});
