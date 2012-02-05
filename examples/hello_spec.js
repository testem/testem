describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).toBe('hello world')
    })
    describe('level 2', function(){
        it('should not say not hello', function(){
            expect(hello()).toNotBe('not hello world')
            console.log('console.logged')
            jasmine.log('jasmine.logged')
            expect('blah').toBe(true, 'you better be true')
        })
        
        it('should throw another exception', function(){
            waits(500)
            throw new Error('Blah')
        })
        describe('level 3', function(){
            
            it('should throw exception', function(){
                //expect(!!navigator.userAgent.match(/Firefox/)).toBe(true)
                throw new Error('Crap')
            })
        })
    })
})