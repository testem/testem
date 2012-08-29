if (typeof require !== 'undefined'){
    var hello = require('./hello');
    var expect = require('chai').expect;
}else{
    var expect = chai.expect;
}


describe('hello', function(){

    it('should say hello', function(){
        expect(hello()).to.equal('hello world');
    });

    it('should also delay', function(done){
        setTimeout(done, 1000);
        done();
    });

    it('should not change reality', function(done){
        expect(1).to.equal(2)
    });
    
});