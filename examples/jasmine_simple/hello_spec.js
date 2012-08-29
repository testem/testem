describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).toBe('heeello world');
    });
    it('should do something else', function(){
        expect('blah').toBe('blah');
    });
});