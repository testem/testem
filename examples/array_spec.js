describe('array', function(){
    it('should map', function(){
        expect([1,2,3].map(function(n){
            return n * 2
        })).toEqual([2,4,6])
    })
})