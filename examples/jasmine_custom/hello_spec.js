describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).toBe('hello world')
    })
    it('should die', function(){
    	throw new Error('die')
    })
})