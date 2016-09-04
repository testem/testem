'use strict';

var browserArgs = require('../../lib/utils/browser-args');
var expect = require('chai').expect;
var log = require('npmlog');

var EventEmitter = require('events').EventEmitter;
var fakeStream = new EventEmitter();

fakeStream.write = function() {};
log.stream = fakeStream;

function createKnownBrowsers() {
  return [{
    name: 'Chrome',
    args: function() {
      return [
        '--testem',
        'http://localhost/'
      ];
    }
  }, {
    name: 'Firefox',
    args: [
      '--testem',
      'http://localhost/'
    ]
  }];
}

describe('browserArgs', function() {
  var config = {
    get: function() {
      return this.browser_args;
    }
  };
  var knownBrowsers;

  describe('methods', function() {
    describe('addCustomArgs', function() {
      afterEach(function() {
        delete config.browser_args;
      });

      it('ignores no input', function() {
        expect(browserArgs.addCustomArgs()).to.equal(undefined);
      });

      it('warns if browser_args is not an object', function(done) {
        config.browser_args = 'invalid';

        log.once('log.warn', function(warning) {
          expect(warning.message).to.equal('Type error: browser_args should be an object');
          done();
        });

        browserArgs.addCustomArgs(createKnownBrowsers(), config);
      });

      // NOTE: knownBrowsers[0] is Chrome
      it('adds args to browser regardless of key capitalization', function() {
        // Get Chrome's default args
        var defaultArgs = createKnownBrowsers()[0].args();

        knownBrowsers = createKnownBrowsers();

        // NOTE: Chrome is not capitalized here
        config.browser_args = {
          chrome: '--fake'
        };

        browserArgs.addCustomArgs(knownBrowsers, config);

        expect(knownBrowsers[0].args()).to.deep.equal([ '--fake' ].concat(defaultArgs));

        // Resets known browsers value
        knownBrowsers = createKnownBrowsers();
      });
    });

    describe('createValidation', function() {
      it('creates an instance of Validation', function() {
        var validation = browserArgs.createValidation();

        expect(validation).to.have.property('knownBrowser', null);
        expect(validation.messages).to.deep.equal([]);
        expect(validation).to.have.property('valid', true);
      });
    });

    describe('dedupeBrowserArgs', function() {
      it('ignores no input', function() {
        expect(browserArgs.dedupeBrowserArgs()).to.equal(undefined);
      });

      it('dedupes args', function(done) {
        var args;

        log.once('log.warn', function(warning) {
          expect(warning.message).to.equal('Removed duplicate arg for Chrome: -b');
          done();
        });

        args = browserArgs.dedupeBrowserArgs('Chrome', [ '-a', '-b', '-b' ]);

        expect(args).to.deep.equal([ '-a', '-b' ]);
      });

      it('returns in tact args if no dupes', function() {
        var argsIn = [ '-a', '-b', '-c' ];
        var argsOut = browserArgs.dedupeBrowserArgs('Chrome', argsIn);

        expect(argsOut).to.deep.equal(argsIn);
      });
    });

    describe('parseArgs', function() {
      beforeEach(function() {
        knownBrowsers = createKnownBrowsers();
      });

      afterEach(function() {
        knownBrowsers = createKnownBrowsers();
      });

      // NOTE: knownBrowsers[0] is Chrome
      it('adds string args to browser with args method', function() {
        // Get Chrome's default args
        var defaultArgs = createKnownBrowsers()[0].args();

        browserArgs.parseArgs('Chrome', '--fake', knownBrowsers);

        expect(knownBrowsers[0].args()).to.deep.equal([ '--fake' ].concat(defaultArgs));
      });

      // NOTE: knownBrowsers[0] is Chrome
      it('adds array args to browser with args method', function() {
        // Get Chrome's default args
        var defaultArgs = createKnownBrowsers()[0].args();

        browserArgs.parseArgs('Chrome', [ '--fake' ], knownBrowsers);

        expect(knownBrowsers[0].args()).to.deep.equal([ '--fake' ].concat(defaultArgs));
      });

      // NOTE: knownBrowsers[1] is Firefox
      it('adds string args to browser with args array', function() {
        // Get Firefox's default args
        var defaultArgs = createKnownBrowsers()[1].args;

        browserArgs.parseArgs('Firefox', '--fake', knownBrowsers);

        expect(knownBrowsers[1].args).to.deep.equal([ '--fake' ].concat(defaultArgs));
      });

      // NOTE: knownBrowsers[1] is Firefox
      it('adds array args to browser with args array', function() {
        // Get Firefox's default args
        var defaultArgs = createKnownBrowsers()[1].args;

        browserArgs.parseArgs('Firefox', [ '--fake' ], knownBrowsers);

        expect(knownBrowsers[1].args).to.deep.equal([ '--fake' ].concat(defaultArgs));
      });
    });

    describe('validate', function() {
      it('ignores invalid arguments', function() {
        var badInputs = [
          [],
          [ 'Chrome' ],
          [ 'Chrome', '--flag' ],
          [ 'Chrome', '--flag', 'invalid' ]
        ];

        badInputs.forEach(function(inputValues) {
          expect(browserArgs.validate.apply(browserArgs, inputValues)).to.equal(undefined);
        });
      });

      it('returns a validation object', function() {
        var validation = browserArgs.validate('Fake', '--flag', knownBrowsers);

        expect(validation).to.have.property('knownBrowser', null);
        expect(validation.messages).to.be.an.instanceof(Array);
        expect(validation).to.have.property('valid', false);
      });

      it('warns if unknown browser in args', function() {
        var validation = browserArgs.validate('Fake', '--flag', knownBrowsers);

        expect(validation.messages[0]).to.equal('Could not find "Fake" in known browsers');
      });
    });

    describe('validateBrowserArgs', function() {
      var validation;

      beforeEach(function() {
        validation = browserArgs.createValidation();
      });

      it('ignores invalid arguments', function() {
        var badInputs = [
          [],
          [ 'Chrome' ],
          [ 'Chrome', '--flag' ]
        ];

        badInputs.forEach(function(inputs) {
          expect(browserArgs.validateBrowserArgs.apply(browserArgs, inputs)).equal(undefined);
        });
      });

      it('warns if args value not a string or array', function() {
        browserArgs.validateBrowserArgs('Chrome', 0, validation);

        expect(validation.messages[0]).to.equal('Type error: Chrome\'s "args" property should be a string or an array');
      });

      it('warns if string arg is empty', function() {
        browserArgs.validateBrowserArgs('Chrome', '', validation);

        expect(validation.messages[0]).to.equal('Bad value: Chrome\'s "args" property should not be empty');
      });

      it('warns if array arg is empty', function() {
        browserArgs.validateBrowserArgs('Chrome', [], validation);

        expect(validation.messages[0]).to.equal('Bad value: Chrome\'s "args" property should not be empty');
      });

      it('warns if array arg contains non-string values', function() {
        browserArgs.validateBrowserArgs('Chrome', [ 0 ], validation);

        expect(validation.messages[0]).to.equal('Bad value: Chrome\'s "args" may only contain strings');
      });

      it('warns if array arg contains empty strings', function() {
        browserArgs.validateBrowserArgs('Chrome', [ ' ' ], validation);

        expect(validation.messages[0]).to.equal('Bad value: Chrome\'s "args" may not contain empty strings');
      });
    });
  });

  describe('multiple warnings', function() {
    afterEach(function() {
      delete config.browser_args;
    });

    it('can log multiple validation warnings', function(done) {
      var count = 1;
      var warnHandler = function(warning) {
        if (count === 1) {
          expect(warning.message).to.equal('Could not find "Fake" in known browsers');
        }

        if (count === 2) {
          expect(warning.message).to.equal('Bad value: Chrome\'s "args" may only contain strings');
          log.removeListener('log.warn', warnHandler);
          done();
        }

        count++;
      };

      config.browser_args = {
        'Fake': '--testem',
        'Chrome': [
          '--testem',
          12345
        ]
      };

      log.on('log.warn', warnHandler);

      browserArgs.addCustomArgs(knownBrowsers, config);
    });
  });
});
