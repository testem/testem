describe('setTimeout', function(){
	for (var i = 0; i < 5; i++){
		it('should wait for some time (' + (i+1) + ')', function(){
			waits(400)
			expect(true).toBe(true)
		})
	}
})