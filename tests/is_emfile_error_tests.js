const expect = require('chai').expect;

const isEmfileError = require('../lib/utils/is_emfile_error');

describe('isEmfileError', function() {
  it('returns true for Error with code EMFILE', function() {
    const err = new Error('watch');
    err.code = 'EMFILE';
    expect(isEmfileError(err)).to.equal(true);
  });

  it('returns false for other codes', function() {
    const err = new Error('nope');
    err.code = 'ENOENT';
    expect(isEmfileError(err)).to.equal(false);
  });

  it('returns false for non-objects', function() {
    expect(isEmfileError(null)).to.equal(false);
    expect(isEmfileError(undefined)).to.equal(false);
    expect(isEmfileError('EMFILE')).to.equal(false);
  });
});
