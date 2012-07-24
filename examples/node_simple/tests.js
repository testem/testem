var hello = require('./hello')
var expect = require('chai').expect

describe('hello', function(){
	it('should say hello', function(){
		expect(hello()).to.equal('hello world')
        console.error('blah')
	})
})