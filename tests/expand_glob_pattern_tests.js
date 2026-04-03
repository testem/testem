const path = require('path');

const expect = require('chai').expect;

const expandGlobPattern = require('../lib/utils/expand_glob_pattern');
const { convertToPosix } = require('../lib/utils/posix');

describe('expandGlobPattern', function() {
  const stylesPattern = convertToPosix(
    path.join(__dirname, 'fixtures', 'styles', '*.css'),
  );

  it('returns a Promise of string paths (contract for any glob backend)', function() {
    const p = expandGlobPattern(stylesPattern, []);
    expect(p).to.be.instanceof(Promise);
    return p.then(function(files) {
      expect(files).to.be.an('array');
      files.forEach(function(f) {
        expect(f).to.be.a('string');
      });
    });
  });

  it('returns paths in sorted lexicographic order', function() {
    return expandGlobPattern(stylesPattern, []).then(function(files) {
      const sorted = files.slice().sort();
      expect(files).to.deep.equal(sorted);
    });
  });

  it('includes exactly the known matching fixture files (by basename)', function() {
    return expandGlobPattern(stylesPattern, []).then(function(files) {
      const names = files.map(function(f) {
        return path.basename(f);
      });
      expect(names.sort()).to.deep.equal(['print.css', 'screen.css']);
    });
  });

  it('returns an empty array when the pattern matches no files', function() {
    const none = convertToPosix(
      path.join(__dirname, 'fixtures', 'no_such_prefix_zzzz', '*.js'),
    );
    return expandGlobPattern(none, []).then(function(files) {
      expect(files).to.deep.equal([]);
    });
  });

  it('excludes paths matching ignore patterns', function() {
    return expandGlobPattern(stylesPattern, [
      convertToPosix('**/print.css'),
    ]).then(function(files) {
      const names = files.map(function(f) {
        return path.basename(f);
      });
      expect(names).to.deep.equal(['screen.css']);
    });
  });

  it('omitting ignore patterns behaves like an empty ignore list', function() {
    return Promise.all([
      expandGlobPattern(stylesPattern, []),
      expandGlobPattern(stylesPattern, undefined),
    ]).then(function(results) {
      expect(results[0]).to.deep.equal(results[1]);
    });
  });

  it('drops empty ignore entries', function() {
    return Promise.all([
      expandGlobPattern(stylesPattern, []),
      expandGlobPattern(stylesPattern, ['', '']),
    ]).then(function(results) {
      expect(results[0]).to.deep.equal(results[1]);
    });
  });
});
