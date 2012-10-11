describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).toBe('hello world');
    });
    it('should do something else', function(){
        expect('blah').toBe('blah');
    });
});