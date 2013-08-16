var Config = require('../lib/config.js')
var test = require('./testutils.js')
var EventEmitter = require('events').EventEmitter
var expect = test.expect
var bd = require('bodydouble')
var stub = bd.stub
var browser_launcher = require('../lib/browser_launcher')
var assert = require('chai').assert

describe('Config', function(){
	var config, appMode, progOptions
	beforeEach(function(){
		appMode = 'dev'
		progOptions = {
			file: __dirname + '/testem.yml',
			timeout: null
		}
		config = new Config(appMode, progOptions)
	})
	afterEach(function(){
		bd.restoreStubs()
	})
	
	it('can create', function(){
		expect(config.progOptions).to.equal(progOptions)
	})
	it('gives progOptions properties when got', function(){
		expect(config.get('file')).to.equal(progOptions.file)
	})

	describe('accepts empty config file', function(){
		var config
		beforeEach(function(done){
			var progOptions = {framework: 'mocha', src_files: 'impl.js,tests.js'}
			config = new Config('dev', progOptions)
			config.read(done)
		})
		it('gets properties from config file', function(){
			expect(config.get('framework')).to.equal('mocha')
			expect(String(config.get('src_files'))).to.equal('impl.js,tests.js')
		})
	})

	describe('read yaml config file', function(){
		beforeEach(function(done){
			config.read(done)
		})
		it('gets properties from config file', function(){
			expect(config.get('framework')).to.equal('jasmine')
			expect(String(config.get('src_files'))).to.equal('implementation.js,tests.js')
		})
		it('falls back to config file value when progOptions is null', function(){
			expect(config.get('timeout')).to.equal(2)
		})
	})

	it('calculates url for you', function(){
		var config = new Config
		assert.equal(config.get('url'), 'http://localhost:7357/')
	})
	
	describe('read json config file', function(){
		var config
		beforeEach(function(done){
			var progOptions = {
				file: __dirname + '/testem.json'
			}
			config = new Config('dev', progOptions)
			config.read(done)
		})
		it('gets properties from config file', function(){
			expect(config.get('framework')).to.equal('mocha')
			expect(String(config.get('src_files'))).to.equal('impl.js,tests.js')
		})
	})

	describe('read js config file', function(){
		var config
		beforeEach(function(done){
			var progOptions = {
				file: __dirname + '/testem.js'
			}
			config = new Config('dev', progOptions)
			config.read(done)
		})
		it('gets properties from config file', function(){
			expect(config.get('framework')).to.equal('mocha')
			expect(String(config.get('src_files'))).to.equal('impl.js,tests.js')
		})
	})

	it('give precendence to json config file', function(done){
		var config = new Config('dev', {cwd: 'tests'})
		config.read(function(){
			expect(config.get('framework')).to.equal('mocha')
			done()
		})
	})
	
	it('returns whether isCwdMode (read js files from current dir)', function(){
		stub(config, 'get', function(key){
			return null
		})
		expect(config.isCwdMode()).to.be.ok
		stub(config, 'get', function(key){
			if (key === 'src_files') return ['implementation.js']
			return null
		})
		expect(config.isCwdMode()).to.not.be.ok
		stub(config, 'get', function(key){
			if (key === 'test_page') return 'tests.html'
			return null
		})
		expect(config.isCwdMode()).to.not.be.ok
	})

	it('has fallbacks for host and port', function(){
		var config = new Config()
		assert.equal(config.get('host'), 'localhost')
		assert.equal(config.get('port'), 7357)
	})
	
	it('should getLaunchers should call getAvailable browsers', function(done){
		stub(config, 'getWantedLaunchers', function(n){return n})
		var getAvailableBrowsers = browser_launcher.getAvailableBrowsers
		browser_launcher.getAvailableBrowsers = function(cb){
			cb([
				{name: 'Chrome', exe: 'chrome.exe'},
				{name: 'Firefox'}
			])
		}
		
		config.getLaunchers(function(launchers){
			expect(launchers.chrome.name).to.equal('Chrome')
			expect(launchers.chrome.settings.exe).to.equal('chrome.exe')
			expect(launchers.firefox.name).to.equal('Firefox')
			browser_launcher.getAvailableBrowsers = getAvailableBrowsers
			done()
		})
	})

	it('should install custom launchers', function(done){
		stub(config, 'getWantedLaunchers', function(n){return n})
		config.config = {
			launchers: {
				Node: {
					command: 'node tests.js'
				}
			}
		}
		var getAvailableBrowsers = browser_launcher.getAvailableBrowsers
		browser_launcher.getAvailableBrowsers = function(cb){cb([])}
		config.getLaunchers(function(launchers){
			expect(launchers.node.name).to.equal('Node')
			expect(launchers.node.settings.command).to.equal('node tests.js')
			browser_launcher.getAvailableBrowsers = getAvailableBrowsers
			done()
		})
	})
	
	it('getWantedLaunchers uses getWantedLauncherNames', function(){
		stub(config, 'getWantedLauncherNames').returns(['Chrome', 'Firefox'])
		var results = config.getWantedLaunchers({
			chrome: { name: 'Chrome' }
			, firefox: { name: 'Firefox' }
		})
		expect(results).to.deep.equal([{ name: 'Chrome' }, { name: 'Firefox' }])

	})

	describe('getWantedLauncherNames', function(){
		it('adds "launch" param', function(){
			config.progOptions.launch = 'Chrome,Firefox'
			expect(config.getWantedLauncherNames()).to.deep.equal(['chrome', 'firefox'])
			config.progOptions.launch = 'IE'
			expect(config.getWantedLauncherNames()).to.deep.equal(['ie'])
		})
		it('adds "launch_in_dev" config', function(){
			config.config = {launch_in_dev: ['Chrome', 'Firefox']}
			expect(config.getWantedLauncherNames()).to.deep.equal(['Chrome', 'Firefox'])
		})
		it('adds "launch_in_ci" config', function(){
			config.appMode = 'ci'
			config.config = {launch_in_ci: ['Chrome', 'Firefox']}
			expect(config.getWantedLauncherNames()).to.deep.equal(['Chrome', 'Firefox'])
		})
		it('removes skip param', function(){
			config.progOptions.launch = 'Chrome,Firefox'
			config.progOptions.skip = 'Chrome'
			expect(config.getWantedLauncherNames()).to.deep.equal(['firefox'])
		})
	})

	function fileEntry(filename, attrs){
		return { src: filename, attrs: attrs || [] }
	}

	describe('getSrcFiles', function(){
		
		beforeEach(function(){
			config.set('cwd', 'tests')
		})

		it('by defaults list all .js files', function(done){
			config.getSrcFiles(function(err, files){
				expect(files.length).be.above(5) // because this dir should have a bunch of .js files
				done()
			})
		})
		it('gets src files', function(done){
			config.set('src_files', ['config_tests.js'])
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([fileEntry('config_tests.js')])
				done()
			})
		})
		it('excludes using src_files_ignore', function(done){
			config.set('src_files', ['integration/*'])
			config.set('src_files_ignore', ['**/*.sh'])
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('integration/browser_tests.bat')])
				done()
			})
		})
		it('can read files from directories with spaces', function(done){
			config.set('cwd', 'tests/space test/')
			config.set('src_files', 'test.js')
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([fileEntry('test.js')])
				done()
			})
		})
		it('can open a file with a space in the filename', function(done){
		  config.set('src_files', 'space test.js')
		  config.getSrcFiles(function(err, files){
		  	expect(files).to.deep.equal([fileEntry('space test.js')])
		    done()
		  })
		})
		it('respects order', function(done){
			config.set('src_files', [
				'integration/browser_tests.bat',
				'filewatcher_tests.js'
			])
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('integration/browser_tests.bat'),
					fileEntry('filewatcher_tests.js')
				])
				done()
			})
		})
		it('populates attributes', function(done){
			config.set('src_files', [{src:'config_tests.js', attrs: [ 'data-foo="true"', 'data-bar' ]}])
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('config_tests.js', ['data-foo="true"', 'data-bar'])
				])
				done()
			})
		})
		it('populates attributes for only the desired globs', function(done){
			config.set('src_files', [
				{src:'config_tests.js', attrs: [ 'data-foo="true"', 'data-bar' ]},
				'integration/*'
			])
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('config_tests.js', ['data-foo="true"', 'data-bar']),
					fileEntry('integration/browser_tests.bat'),
					fileEntry('integration/browser_tests.sh')
				])
				done()
			})
		})
		it('populates attributes for only the desired globs and excludes usig src_files_ignore', function(done){
			config.set('src_files', [
				fileEntry('config_tests.js', [ 'data-foo="true"', 'data-bar' ]),
				'integration/*'
			])
			config.set('src_files_ignore', '**/*.sh')
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('config_tests.js', ['data-foo="true"', 'data-bar']),
					fileEntry('integration/browser_tests.bat')
				])
				done()
			})
		})
	})

	describe('getServeFiles', function(){
		it('just delegates to getFileSet', function(done){
			var egg = []
			config.set('src_files', 'integration/*')
			config.set('src_files_ignore', '**/*.sh')
			config.getFileSet = function(want, dontWant, cb){
				expect(want).to.equal('integration/*')
				expect(dontWant).to.equal('**/*.sh')
				process.nextTick(function(){ cb(null, egg) })
			}
			config.getServeFiles(function(err, files){
				expect(files).to.equal(egg)
				done()
			})
		})
	})
})


function mockTopLevelProgOptions(){
	var options = [
		{ name: function(){ return 'timeout' } }
	]
	var commands = [
		{ name: function(){ return 'ci' } }
		, { name: function(){ return 'launchers' } }
	]
	var parentOptions = {
		port: 8081
		, options: [
			{name: function(){ return 'port' }}
			, { name: function(){ return 'launcher' } }
		]
		, cwd: 'tests'
	}
	var progOptions = {
		timeout: 2
		, parent: parentOptions
		, __proto__: parentOptions
		, options: options
		, commands: commands
		, _events: []
	}
	return progOptions
}

describe('getTemplateData', function(){
	it('should give templateData', function(done){
		var fileConfig = {
			src_files: [
				"web/*.js",
			]
		}
		var progOptions = mockTopLevelProgOptions()
		var config = new Config('dev', progOptions, fileConfig)
		config.getTemplateData(function(err, data){
			expect(data).to.deep.equal({
				timeout: 2,
				port: 8081,
				src_files: ['web/*.js'],
				serve_files: [
					{src:'web/hello.js', attrs: []},
					{src:'web/hello_tst.js', attrs: []}
				]
			})
			done()
		})
	})

})