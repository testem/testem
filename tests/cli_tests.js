const { expect } = require('chai');
const { parseArgs } = require('../testem');

// Wrap argv as if coming from `node testem <args>`, with exitOverride so
// commander throws instead of calling process.exit during tests.
function argv(...args) {
  return [['node', 'testem', ...args], { exitOverride: true }];
}

describe('CLI argument parsing (parseArgs)', function() {
  // Regression guard: commander v14 no longer exposes option values as direct
  // properties on the Command object. progOptions must be a plain object from
  // program.opts() / optsWithGlobals() so that option values are accessible
  // as progOptions.port, progOptions.file, etc. without going through the
  // Command API. Before the fix, progOptions was set to the Command object
  // directly, causing all option values to silently be `undefined`.

  describe('dev mode (no subcommand)', function() {
    it('sets appMode to "dev"', function() {
      const { appMode } = parseArgs(...argv());
      expect(appMode).to.equal('dev');
    });

    it('exposes --port value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-p', '1234'));
      expect(progOptions.port).to.equal(1234);
    });

    it('exposes --file value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-f', 'my.json'));
      expect(progOptions.file).to.equal('my.json');
    });

    it('exposes --host value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('--host', 'example.com'));
      expect(progOptions.host).to.equal('example.com');
    });

    it('exposes --launch value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-l', 'Chrome,Firefox'));
      expect(progOptions.launch).to.equal('Chrome,Firefox');
    });

    it('exposes --skip value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-s', 'IE'));
      expect(progOptions.skip).to.equal('IE');
    });

    it('exposes --debug value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-d', 'my.log'));
      expect(progOptions.debug).to.equal('my.log');
    });

    it('exposes --test_page value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-t', 'test.html'));
      expect(progOptions.test_page).to.equal('test.html');
    });

    it('exposes --growl flag as a plain property', function() {
      const { progOptions } = parseArgs(...argv('-g'));
      expect(progOptions.growl).to.equal(true);
    });

    it('attaches _commander for internal option enumeration', function() {
      const { progOptions } = parseArgs(...argv());
      expect(progOptions._commander).to.exist();
      expect(progOptions._commander.options).to.be.an('array');
    });

    it('progOptions is a plain object, not a Command instance', function() {
      // Regression guard: before the fix, progOptions was set to the Command
      // object directly. In commander v14, option values are NOT stored as
      // direct Command properties, so progOptions.port etc. would all be
      // undefined. opts() returns a plain object with the parsed values.
      const { progOptions } = parseArgs(...argv());
      expect(Object.getPrototypeOf(progOptions)).to.equal(
        Object.prototype,
        'progOptions must be a plain object from program.opts(), not a Command instance',
      );
    });

    it('_commander.options lists all top-level declared options', function() {
      // getAllOptions() in config.js traverses _commander.options to build the
      // set of known option names. Verify all declared flags are present.
      const { progOptions } = parseArgs(...argv());
      const names = progOptions._commander.options.map((o) => o.name());
      expect(names).to.include('file');
      expect(names).to.include('port');
      expect(names).to.include('host');
      expect(names).to.include('launch');
      expect(names).to.include('skip');
      expect(names).to.include('debug');
      expect(names).to.include('test_page');
      expect(names).to.include('growl');
    });

    describe('long-form aliases', function() {
      it('--port is equivalent to -p', function() {
        const { progOptions } = parseArgs(...argv('--port', '5000'));
        expect(progOptions.port).to.equal(5000);
      });

      it('--file is equivalent to -f', function() {
        const { progOptions } = parseArgs(...argv('--file', 'long.json'));
        expect(progOptions.file).to.equal('long.json');
      });

      it('--launch is equivalent to -l', function() {
        const { progOptions } = parseArgs(...argv('--launch', 'Safari'));
        expect(progOptions.launch).to.equal('Safari');
      });

      it('--skip is equivalent to -s', function() {
        const { progOptions } = parseArgs(...argv('--skip', 'Opera'));
        expect(progOptions.skip).to.equal('Opera');
      });

      it('--debug without a value sets debug to true (filename defaults in config)', function() {
        // --debug is declared as [file] (optional), so bare -d sets it to true.
        // Config.js then converts true -> 'testem.log'.
        const { progOptions } = parseArgs(...argv('--debug'));
        expect(progOptions.debug).to.equal(true);
      });

      it('--test_page is equivalent to -t', function() {
        const { progOptions } = parseArgs(...argv('--test_page', 'suite.html'));
        expect(progOptions.test_page).to.equal('suite.html');
      });

      it('--growl is equivalent to -g', function() {
        const { progOptions } = parseArgs(...argv('--growl'));
        expect(progOptions.growl).to.equal(true);
      });
    });
  });

  describe('ci subcommand', function() {
    it('sets appMode to "ci"', function() {
      const { appMode } = parseArgs(...argv('ci'));
      expect(appMode).to.equal('ci');
    });

    it('exposes ci-specific --reporter value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('ci', '-R', 'tap'));
      expect(progOptions.reporter).to.equal('tap');
    });

    it('exposes ci-specific --parallel value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('ci', '-P', '4'));
      expect(progOptions.parallel).to.equal(4);
    });

    it('exposes ci-specific --cwd value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('ci', '--cwd', '/tmp'));
      expect(progOptions.cwd).to.equal('/tmp');
    });

    it('exposes ci-specific --timeout value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('ci', '-T', '30'));
      expect(progOptions.timeout).to.equal('30');
    });

    it('exposes ci-specific --bail_on_uncaught_error flag as a plain property', function() {
      const { progOptions } = parseArgs(...argv('ci', '-b'));
      expect(progOptions.bail_on_uncaught_error).to.equal(true);
    });

    it('exposes ci-specific --config_dir value as a plain property', function() {
      const { progOptions } = parseArgs(...argv('ci', '--config_dir', '/cfg'));
      expect(progOptions.config_dir).to.equal('/cfg');
    });

    it('--timeout defaults to null when not provided', function() {
      const { progOptions } = parseArgs(...argv('ci'));
      expect(progOptions.timeout).to.equal(null);
    });

    it('exposes global --port value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(...argv('-p', '9000', 'ci'));
      expect(progOptions.port).to.equal(9000);
    });

    it('exposes global --file value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(...argv('-f', 'ci.json', 'ci'));
      expect(progOptions.file).to.equal('ci.json');
    });

    it('exposes global --host value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(...argv('--host', 'ci.host', 'ci'));
      expect(progOptions.host).to.equal('ci.host');
    });

    it('attaches _commander for internal option enumeration', function() {
      const { progOptions } = parseArgs(...argv('ci'));
      expect(progOptions._commander).to.exist();
      expect(progOptions._commander.options).to.be.an('array');
    });

    it('progOptions is a plain object, not a Command instance', function() {
      const { progOptions } = parseArgs(...argv('ci'));
      expect(Object.getPrototypeOf(progOptions)).to.equal(Object.prototype);
    });

    it('_commander.options lists ci-specific options', function() {
      const { progOptions } = parseArgs(...argv('ci'));
      const names = progOptions._commander.options.map((o) => o.name());
      expect(names).to.include('reporter');
      expect(names).to.include('parallel');
      expect(names).to.include('timeout');
      expect(names).to.include('cwd');
      expect(names).to.include('config_dir');
    });

    it('_commander.parent.options lists top-level options (for getAllOptions traversal)', function() {
      const { progOptions } = parseArgs(...argv('ci'));
      const parentNames = progOptions._commander.parent.options.map((o) =>
        o.name(),
      );
      expect(parentNames).to.include('port');
      expect(parentNames).to.include('file');
    });

    describe('long-form aliases', function() {
      it('--reporter is equivalent to -R', function() {
        const { progOptions } = parseArgs(...argv('ci', '--reporter', 'dot'));
        expect(progOptions.reporter).to.equal('dot');
      });

      it('--parallel is equivalent to -P', function() {
        const { progOptions } = parseArgs(...argv('ci', '--parallel', '2'));
        expect(progOptions.parallel).to.equal(2);
      });

      it('--timeout is equivalent to -T', function() {
        const { progOptions } = parseArgs(...argv('ci', '--timeout', '60'));
        expect(progOptions.timeout).to.equal('60');
      });

      it('--bail_on_uncaught_error is equivalent to -b', function() {
        const { progOptions } = parseArgs(
          ...argv('ci', '--bail_on_uncaught_error'),
        );
        expect(progOptions.bail_on_uncaught_error).to.equal(true);
      });
    });
  });

  describe('launchers subcommand', function() {
    it('sets appMode to "launchers"', function() {
      const { appMode } = parseArgs(...argv('launchers'));
      expect(appMode).to.equal('launchers');
    });

    it('exposes global --file value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(...argv('-f', 'x.json', 'launchers'));
      expect(progOptions.file).to.equal('x.json');
    });

    it('exposes global --port value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(...argv('-p', '7777', 'launchers'));
      expect(progOptions.port).to.equal(7777);
    });

    it('progOptions is a plain object, not a Command instance', function() {
      const { progOptions } = parseArgs(...argv('launchers'));
      expect(Object.getPrototypeOf(progOptions)).to.equal(Object.prototype);
    });

    it('attaches _commander for internal option enumeration', function() {
      const { progOptions } = parseArgs(...argv('launchers'));
      expect(progOptions._commander).to.exist();
      expect(progOptions._commander.options).to.be.an('array');
    });
  });

  describe('server subcommand', function() {
    it('sets appMode to "server"', function() {
      const { appMode } = parseArgs(...argv('server'));
      expect(appMode).to.equal('server');
    });

    it('exposes global --port value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(...argv('-p', '8080', 'server'));
      expect(progOptions.port).to.equal(8080);
    });

    it('exposes global --host value via optsWithGlobals', function() {
      const { progOptions } = parseArgs(
        ...argv('--host', 'srv.host', 'server'),
      );
      expect(progOptions.host).to.equal('srv.host');
    });

    it('progOptions is a plain object, not a Command instance', function() {
      const { progOptions } = parseArgs(...argv('server'));
      expect(Object.getPrototypeOf(progOptions)).to.equal(Object.prototype);
    });

    it('attaches _commander for internal option enumeration', function() {
      const { progOptions } = parseArgs(...argv('server'));
      expect(progOptions._commander).to.exist();
      expect(progOptions._commander.options).to.be.an('array');
    });
  });

  describe('option coercion', function() {
    it('--port coerces its value to a Number', function() {
      const { progOptions } = parseArgs(...argv('-p', '7357'));
      expect(progOptions.port).to.be.a('number');
      expect(progOptions.port).to.equal(7357);
    });

    it('--parallel coerces its value to a Number', function() {
      const { progOptions } = parseArgs(...argv('ci', '-P', '8'));
      expect(progOptions.parallel).to.be.a('number');
      expect(progOptions.parallel).to.equal(8);
    });
  });

  describe('unknown options', function() {
    it('throws on an unknown option (breaking change from commander v2)', function() {
      // commander v2 silently ignored unknown options; v14 exits with an error.
      // With exitOverride, it throws instead of calling process.exit.
      expect(() => parseArgs(...argv('--not-a-real-option'))).to.throw();
    });

    it('throws on an unknown option for the ci subcommand', function() {
      expect(() => parseArgs(...argv('ci', '--not-a-real-option'))).to.throw();
    });
  });

  describe('exitOverride option', function() {
    it('does not throw without exitOverride (uses process.exit instead)', function() {
      // Without exitOverride the call would exit the process, so we only verify
      // the option is accepted and doesn't throw when not set. We test the
      // normal no-arg path which doesn't trigger help/exit.
      expect(() => parseArgs(['node', 'testem'])).to.not.throw();
    });
  });
});
