var Config = require('../lib/config.js')
  , test = require('./testutils.js')
  , EventEmitter = require('events').EventEmitter
  , expect = test.expect

describe('Config', function(){
	var config, progOptions
	beforeEach(function(){
		progOptions = {
			file: __dirname + '/testem.yml'
		}
		config = new Config(progOptions)
	})
	it('can create', function(){
		expect(config.progOptions).to.equal(progOptions)
	})
	it('gives progOptions properties when got', function(){
		expect(config.get('file')).to.equal(progOptions.file)
	})
	describe('read yaml config file', function(){
		beforeEach(function(done){
			config.read(done)
		})
		it('gets properties from config file', function(){
			expect(config.get('framework')).to.equal('jasmine')
			expect(String(config.get('src_files'))).to.equal('implementation.js,tests.js')
		})
	})
	
	describe('read json config file', function(){
		var config
		beforeEach(function(done){
			var progOptions = {
				file: __dirname + '/testem.json'
			}
			config = new Config(progOptions)
			config.read(done)
		})
		it('gets properties from config file', function(){
			expect(config.get('framework')).to.equal('mocha')
			expect(String(config.get('src_files'))).to.equal('impl.js,tests.js')
		})
	})

	it('give precendence to json config file', function(){
		var config = new Config({})
		config.read(function(){
			expect(config.get('framework')).to.equal('mocha')
		})
	})

	it('returns whether isCwdMode (read js files from current dir)', function(){
		test.stub(config, 'get', function(key){
			return null
		})
		expect(config.isCwdMode()).to.be.ok
		config.get.restore()
		test.stub(config, 'get', function(key){
			if (key === 'src_files') return ['implementation.js']
			return null
		})
		expect(config.isCwdMode()).to.not.be.ok
		config.get.restore()
		test.stub(config, 'get', function(key){
			if (key === 'test_page') return 'tests.html'
			return null
		})
		expect(config.isCwdMode()).to.not.be.ok
		config.get.restore()
	})
})