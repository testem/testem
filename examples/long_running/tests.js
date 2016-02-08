describe('setTimeout', function(){
	for (var i = 0; i < 100; i++) {
		(function(j) {
			it('should wait for some time (' + (i+1) + ')', function() {
				expect(i).not.toBe(j);
				waits(50);
			});
		})(i);
	}
});
