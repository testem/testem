describe('setTimeout', function() {
  for (var i = 0; i < 100; i++) {
    (function(j) {
      it('should wait for some time (' + (i + 1) + ')', function(done) {
        expect(i).not.toBe(j);
        setTimeout(done, 50);
      });
    })(i);
  }
});
