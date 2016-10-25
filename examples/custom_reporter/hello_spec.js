var expect = chai.expect;

describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).to.equal('hello world');
    });
    it('should say hello to person', function(){
        expect(hello('Bob')).to.equal('hello Bob');
    });
});
