const path = require('path');

const expect = require('chai').expect;

const Config = require('../lib/config.js');
const {
  buildWatchGlobPolicy,
  flattenPatternList,
  pathMatchesWatchTarget,
  expandWatchableFilePaths,
} = require('../lib/utils/file_watch_glob_policy.js');
const { convertToPosix } = require('../lib/utils/posix.js');

describe('file_watch_glob_policy', function() {
  function mockConfig(overrides) {
    const state = {
      file: undefined,
      watch_files: undefined,
      src_files: undefined,
      src_files_ignore: undefined,
      cwdMode: false,
      ...overrides,
    };
    return {
      get(key) {
        return state[key];
      },
      isCwdMode() {
        return !!state.cwdMode;
      },
      cwd() {
        return state.cwd || process.cwd();
      },
      resolvePath(filepath) {
        if (filepath[0] === '/') {
          return filepath;
        }
        return path.resolve(this.cwd(), filepath);
      },
    };
  }

  describe('flattenPatternList', function() {
    it('flattens string arrays and { src } entries', function() {
      expect(
        flattenPatternList([
          'a.js',
          { src: 'b.js', attrs: [] },
        ]),
      ).to.deep.equal(['a.js', 'b.js']);
    });
  });

  describe('buildWatchGlobPolicy', function() {
    it('defaults src_files to *.js', function() {
      const policy = buildWatchGlobPolicy(mockConfig({}));
      expect(policy.includePatterns).to.deep.equal(['*.js']);
      expect(policy.ignorePatterns).to.deep.equal([]);
    });

    it('orders includes like FileWatcher: file, cwd *.js, watch_files, src_files', function() {
      const policy = buildWatchGlobPolicy(
        mockConfig({
          file: 'testem.json',
          cwdMode: true,
          watch_files: ['w/**/*.js'],
          src_files: ['src/**/*.js'],
        }),
      );
      expect(policy.includePatterns).to.deep.equal([
        'testem.json',
        '*.js',
        'w/**/*.js',
        'src/**/*.js',
      ]);
    });

    it('collects src_files_ignore', function() {
      const policy = buildWatchGlobPolicy(
        mockConfig({
          src_files_ignore: ['**/vendor/**', 'dist/**'],
        }),
      );
      expect(policy.ignorePatterns).to.deep.equal(['**/vendor/**', 'dist/**']);
    });
  });

  describe('pathMatchesWatchTarget', function() {
    it('matches **/*.js and excludes **/vendor/**', function() {
      const policy = buildWatchGlobPolicy(
        mockConfig({
          src_files: ['**/*.js'],
          src_files_ignore: ['**/vendor/**'],
        }),
      );
      expect(pathMatchesWatchTarget('src/app.js', policy)).to.be.true();
      expect(pathMatchesWatchTarget('vendor/pkg/x.js', policy)).to.be.false();
    });

    it('exclude wins when both could match', function() {
      const policy = buildWatchGlobPolicy(
        mockConfig({
          src_files: ['**/*.js'],
          src_files_ignore: ['**/report*.js'],
        }),
      );
      expect(pathMatchesWatchTarget('ci/report_x.js', policy)).to.be.false();
      expect(pathMatchesWatchTarget('ci/dev_tests.js', policy)).to.be.true();
    });

    it('matches POSIX paths with forward slashes', function() {
      const policy = buildWatchGlobPolicy(
        mockConfig({ src_files: ['**/*.js'] }),
      );
      expect(pathMatchesWatchTarget('src/sub/file.js', policy)).to.be.true();
    });

    it('portable matching uses forward slashes; convertToPosix only rewrites \\ on Windows', function() {
      const policy = buildWatchGlobPolicy(
        mockConfig({ src_files: ['**/*.js'] }),
      );
      expect(convertToPosix('src\\sub\\file.js')).to.equal(
        path.sep === '\\' ? 'src/sub/file.js' : 'src\\sub\\file.js',
      );
      expect(pathMatchesWatchTarget('src/sub/file.js', policy)).to.be.true();
    });
  });

  describe('expandWatchableFilePaths', function() {
    it('expands globs under cwd like getFileSet (real Config)', async function() {
      const config = new Config(
        'dev',
        { cwd: path.join(__dirname) },
        { reporter: 'tap' },
      );
      config.set('src_files', 'fixtures/styles/*.css');
      config.set('src_files_ignore', '');
      const files = await expandWatchableFilePaths(config);
      const names = files.map(function(f) {
        return path.basename(f);
      });
      expect(names.sort()).to.deep.equal(['print.css', 'screen.css']);
    });

    it('respects ignore when expanding', async function() {
      const config = new Config(
        'dev',
        { cwd: path.join(__dirname) },
        { reporter: 'tap' },
      );
      config.set('src_files', 'fixtures/styles/*.css');
      config.set('src_files_ignore', ['**/print.css']);
      const files = await expandWatchableFilePaths(config);
      expect(files.map(function(f) {
        return path.basename(f);
      })).to.deep.equal(['screen.css']);
    });

    it('keeps http URLs as literals without globbing', async function() {
      const config = new Config('dev', { cwd: path.join(__dirname) }, {});
      config.set('src_files', [
        'fixtures/styles/screen.css',
        'https://cdn.example.com/lib.css',
      ]);
      const files = await expandWatchableFilePaths(config);
      expect(files.some(function(f) {
        return f.indexOf('https://cdn.example.com/lib.css') === 0;
      })).to.be.true();
    });
  });
});
