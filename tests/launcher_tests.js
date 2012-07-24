var Launcher = require('../lib/launcher')
  , test = require('./testutils.js')
  , expect = test.expect

describe('Launcher', function(){
	it('should instantiate', function(){
		var l = new Launcher('Foo')
		expect(l.name).to.equal('Foo')
	})
	it('should launch something, and also kill it', function(done){
		var launcher = new Launcher('Yes', {
			exe: 'yes'

		})
		launcher.launch()
		setTimeout(function(){

			launcher.kill(done)
		}, 1000)
	})
})