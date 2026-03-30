

const yaml = require('js-yaml');
const extend = Object.assign;
const EventEmitter = require('events').EventEmitter;
const { Parser: TapParser } = require('tap-parser');
const log = require('./log');

module.exports = class TapConsumer extends EventEmitter {
  constructor() {
    super();

    this.namePrefix = '';
    this.prefixStack = [];
    this.childParsers = [];

    this.stream = new TapParser();
    this.attachParser(this.stream, true);
  }

  attachParser(parser, isRoot) {
    parser.on('assert', this.onTapAssert.bind(this));
    parser.on('extra', this.onTapExtra.bind(this));
    parser.on('child', this.onChildParser.bind(this));
    parser.on('complete', this.onParserComplete.bind(this, parser));
    if (isRoot) {
      parser.on('bailout', this.onTapError.bind(this));
    }
  }

  onChildParser(childParser) {
    this.prefixStack.push(this.namePrefix);
    const parentPrefix = this.namePrefix;
    const segment = (childParser.name && childParser.name.trim()) || '';
    if (parentPrefix && segment) {
      this.namePrefix = `${parentPrefix} > ${segment}`;
    } else if (segment) {
      this.namePrefix = segment;
    } else if (parentPrefix) {
      this.namePrefix = parentPrefix;
    } else {
      this.namePrefix = '';
    }

    this.childParsers.push(childParser);
    this.attachParser(childParser, false);
  }

  onParserComplete(parser) {
    if (parser === this.stream) {
      this.onTapEnd();
      return;
    }
    this.namePrefix = this.prefixStack.pop();
    const idx = this.childParsers.indexOf(parser);
    if (idx !== -1) {
      this.childParsers.splice(idx, 1);
    }
  }

  onTapAssert(data) {
    log.verbose(JSON.stringify(data, null, 2));

    if (data.id === undefined) {
      return;
    }

    const baseName = data.name ? data.name.trim() : '';
    const qualifiedName = this.namePrefix
      ? `${this.namePrefix} > ${baseName}`
      : baseName;

    let test = {
      passed: 0,
      failed: 0,
      total: 1,
      id: data.id,
      name: qualifiedName,
      items: []
    };

    if (data.skip) {
      test.skipped = true;
      this.emit('test-result', test);
      return;
    }

    if (data.todo) {
      test.todo = true;
    }

    if (!data.ok) {
      let stack;
      if (data.diag) {
        stack = data.diag.stack || data.diag.at;
      }
      if (stack) {
        stack = yaml.dump(stack);
      }
      data = extend(data, data.diag);

      this.latestItem = extend(data, {
        passed: false,
        stack: stack
      });
      test.items.push(this.latestItem);
      test.failed++;
    } else {
      test.passed++;
    }
    this.emit('test-result', test);
  }

  onTapExtra(extra) {
    if (!this.latestItem) {
      return;
    }

    if (this.latestItem.stack) {
      this.latestItem.stack += extra;
    } else {
      this.latestItem.stack = extra;
    }
  }

  detachAllListeners() {
    this.stream.removeAllListeners();
    for (const p of this.childParsers) {
      p.removeAllListeners();
    }
    this.childParsers = [];
    this.prefixStack = [];
    this.namePrefix = '';
  }

  onTapError(reason) {
    let test = {
      failed: 1,
      name: 'bailout',
      items: [],
      error: {
        message: reason
      }
    };

    this.detachAllListeners();
    this.emit('test-result', test);
    this.emit('all-test-results');
  }

  onTapEnd() {
    this.detachAllListeners();
    this.emit('all-test-results');
  }
};
