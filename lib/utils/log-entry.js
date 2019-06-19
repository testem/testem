'use strict';

/**
 * A class to a single log entry.
 *
 * @class LogEntry
 */
module.exports = class LogEntry {
  constructor(type, text, testContext) {
    this.type = type;
    this.text = text;
    if (testContext) {
      this.testContext = testContext;
    }
  }

  toString() {
    return this.testContext ?
      `testContext: ${this.testContext}\n${this.type.toUpperCase()}: ${this.text}` :
      `${this.type.toUpperCase()}: ${this.text}`;
  }
};
