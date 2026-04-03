const expect = require('chai').expect;

const {
  pathMatchesPattern,
  pathMatchesAny,
} = require('../lib/utils/path_pattern_match');

describe('path_pattern_match', function() {
  describe('pathMatchesPattern', function() {
    it('returns false for empty or null pattern', function() {
      expect(pathMatchesPattern('a/b.js', '')).to.be.false();
      expect(pathMatchesPattern('a/b.js', null)).to.be.false();
    });

    it('matches simple filename globs', function() {
      expect(pathMatchesPattern('foo.js', '*.js')).to.be.true();
      expect(pathMatchesPattern('src/foo.js', '*.js')).to.be.false();
    });

    it('matches ** across path segments (globstar)', function() {
      expect(pathMatchesPattern('src/foo/bar.js', '**/*.js')).to.be.true();
      expect(pathMatchesPattern('bar.js', '**/*.js')).to.be.true();
    });

    it('matches ? single-character wildcards', function() {
      expect(pathMatchesPattern('file1.js', 'file?.js')).to.be.true();
      expect(pathMatchesPattern('file10.js', 'file?.js')).to.be.false();
    });

    it('matches vendor-style ** segments', function() {
      expect(pathMatchesPattern('node_modules/pkg/a.js', '**/node_modules/**')).to.be.true();
      expect(pathMatchesPattern('src/a.js', '**/node_modules/**')).to.be.false();
    });

    it('respects { dot: true } so * can match dot segments when enabled', function() {
      expect(pathMatchesPattern('.env', '*')).to.be.false();
      expect(pathMatchesPattern('.env', '*', { dot: true })).to.be.true();
    });

    it('passes through matcher options (e.g. nocase)', function() {
      expect(pathMatchesPattern('Foo.JS', '*.js')).to.be.false();
      expect(pathMatchesPattern('Foo.JS', '*.js', { nocase: true })).to.be.true();
    });
  });

  describe('pathMatchesAny', function() {
    it('returns false for empty or missing pattern list', function() {
      expect(pathMatchesAny('x.js', [])).to.be.false();
      expect(pathMatchesAny('x.js', undefined)).to.be.false();
    });

    it('returns true when any pattern matches', function() {
      expect(
        pathMatchesAny('src/x.js', ['*.css', '**/*.js']),
      ).to.be.true();
      expect(
        pathMatchesAny('x.css', ['*.css', '**/*.js']),
      ).to.be.true();
      expect(
        pathMatchesAny('deep/x.css', ['*.css', '**/*.css']),
      ).to.be.true();
    });

    it('returns false when no pattern matches', function() {
      expect(
        pathMatchesAny('readme.md', ['**/*.js', '**/*.ts']),
      ).to.be.false();
    });

    it('ignores empty strings in the pattern list', function() {
      expect(pathMatchesAny('a.js', ['', '**/*.js'])).to.be.true();
      expect(pathMatchesAny('a.js', ['', ''])).to.be.false();
    });

    it('uses the same options for every pattern', function() {
      expect(
        pathMatchesAny('X.JS', ['*.js'], { nocase: true }),
      ).to.be.true();
    });
  });

  describe('contract for swapping minimatch → picomatch later', function() {
    it('normalizes expectations: POSIX-style paths with forward slashes', function() {
      const p = 'deep/nested/dir/file.js';
      expect(pathMatchesPattern(p, '**/file.js')).to.be.true();
    });

    it('double-star ignore-style patterns used in Testem configs', function() {
      expect(
        pathMatchesAny('vendor/lib/x.js', ['**/vendor/**', 'node_modules/**']),
      ).to.be.true();
      expect(
        pathMatchesAny('src/x.js', ['**/report*.js']),
      ).to.be.false();
      expect(
        pathMatchesPattern('ci/report_x.js', '**/report*.js'),
      ).to.be.true();
    });
  });
});
