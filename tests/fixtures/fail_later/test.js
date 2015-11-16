/* globals waitsFor, runs */
describe('I fail', function() {
  it('later', function() {
    waitsFor(function() {
      return false;
    }, '', 30000);
    runs(function() {
      throw new Error('oops');
    });
  });
});
