var Config = require('../lib/config.js')
var chai = require('chai')
var assert = chai.assert
var expect = chai.expect
var bd = require('bodydouble')
var stub = bd.stub
var browserLauncher = require('../lib/browser_launcher')
var path = require('path')

chai.use(require('dirty-chai'))

describe('Config', function(){
	var config, appMode, progOptions
	beforeEach(function(){
		appMode = 'dev'
		progOptions = {
			file: __dirname + '/testem.yml',
			timeout: null,
			port: undefined
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

	it('ignores undefined progOptions', function(){
		expect(config.get('port')).not.to.be.undefined()
	})

	describe('accepts empty config file', function(){
		var config
		beforeEach(function(done){
			var progOptions = {framework: 'mocha', src_files: 'impl.js,tests.js', cwd: __dirname + '/empty'}
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
		var config = new Config()
		assert.equal(config.get('url'), 'http://localhost:7357/')
	})

	it('allows to overwrite config values', function(){
		var config = new Config('dev', { port: 8000 })
		assert.equal(config.get('port'), 8000)
		config.set('port', 8080)
		assert.equal(config.get('port'), 8080)
	})

	it('returns undefined for undefined keys', function(){
		var config = new Config()
		expect(config.get('undefined')).to.be.undefined()
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
		stub(config, 'get', function() {
			return null
		})
		expect(config.isCwdMode()).to.be.ok()
		stub(config, 'get', function(key){
			if (key === 'src_files') {
				return ['implementation.js']
			}
			return null
		})
		expect(config.isCwdMode()).to.not.be.ok()
		stub(config, 'get', function(key){
			if (key === 'test_page') {
				return 'tests.html'
			}
			return null
		})
		expect(config.isCwdMode()).to.not.be.ok()
	})

	it('has fallbacks for host and port', function(){
		var config = new Config()
		assert.equal(config.get('host'), 'localhost')
		assert.equal(config.get('port'), 7357)
	})

	it('should getLaunchers should call getAvailable browsers', function(done){
		stub(config, 'getWantedLaunchers', function(n, cb){return cb(null, n)})
		var getAvailableBrowsers = browserLauncher.getAvailableBrowsers
		browserLauncher.getAvailableBrowsers = function(cb){
			cb([
				{name: 'Chrome', exe: 'chrome.exe'},
				{name: 'Firefox'}
			])
		}

		config.getLaunchers(function(err, launchers){
			expect(launchers.chrome.name).to.equal('Chrome')
			expect(launchers.chrome.settings.exe).to.equal('chrome.exe')
			expect(launchers.firefox.name).to.equal('Firefox')
			browserLauncher.getAvailableBrowsers = getAvailableBrowsers
			done()
		})
	})

	it('should install custom launchers', function(done){
		stub(config, 'getWantedLaunchers', function(n, cb){return cb(null, n)})
		config.config = {
			launchers: {
				Node: {
					command: 'node tests.js'
				}
			}
		}
		var getAvailableBrowsers = browserLauncher.getAvailableBrowsers
		browserLauncher.getAvailableBrowsers = function(cb){cb([])}
		config.getLaunchers(function(err, launchers){
			expect(launchers.node.name).to.equal('Node')
			expect(launchers.node.settings.command).to.equal('node tests.js')
			browserLauncher.getAvailableBrowsers = getAvailableBrowsers
			done()
		})
	})

	it('getWantedLaunchers uses getWantedLauncherNames', function(done){
		stub(config, 'getWantedLauncherNames').returns(['Chrome', 'Firefox'])
		config.getWantedLaunchers({
			chrome: { name: 'Chrome' },
			firefox: { name: 'Firefox' }
		}, function(err, results) {
			expect(results).to.deep.equal([{ name: 'Chrome' }, { name: 'Firefox' }])
			done()
		})
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
					fileEntry('integration' + path.sep + 'browser_tests.bat')])
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
					fileEntry('integration' + path.sep + 'browser_tests.bat')
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
					fileEntry('integration' + path.sep + 'browser_tests.bat'),
					fileEntry('integration' + path.sep + 'browser_tests.sh')
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
					fileEntry('integration' + path.sep + 'browser_tests.bat')
				])
				done()
			})
		})
		it('allows URLs', function(done){
			config.set('src_files', [
				'file://integration/*', 'http://codeorigin.jquery.com/jquery-2.0.3.min.js'
			])
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('integration' + path.sep + 'browser_tests.bat'),
					fileEntry('integration' + path.sep + 'browser_tests.sh'),
					fileEntry('http://codeorigin.jquery.com/jquery-2.0.3.min.js')
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

	describe('getCSSFiles', function(){
		it('loads css_files correctly', function(done){
			config.set('cwd', 'tests')
			config.set('src_files', 'fixtures/styles/*.css')
			config.getSrcFiles(function(err, files){
				expect(files).to.deep.equal([
					fileEntry('fixtures' + path.sep + 'styles' + path.sep + 'print.css'),
					fileEntry('fixtures' + path.sep + 'styles' + path.sep + 'screen.css')
				])
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
		{ name: function(){ return 'ci' } },
		{ name: function(){ return 'launchers' } }
	]
	var parentOptions = {
		port: 8081,
		options: [
			{name: function(){ return 'port' }},
			{name: function(){ return 'launcher' }}
		],
		cwd: 'tests'
	}
	var progOptions = {
		timeout: 2,
		parent: parentOptions,
		__proto__: parentOptions,
		options: options,
		commands: commands,
		_events: []
	}
	return progOptions
}

describe('getTemplateData', function(){
	it('should give templateData', function(done){
		var fileConfig = {
			src_files: [
				'web/*.js'
			]
		}
		var progOptions = mockTopLevelProgOptions()
		var config = new Config('dev', progOptions, fileConfig)
		config.getTemplateData(function(err, data){
			expect(data.serve_files).to.deep.have.members([
				{ src: 'web/hello.js', attrs: [] },
				{ src: 'web/hello_tst.js', attrs: [] }
			]);
			expect(data.css_files).to.deep.have.members([
				{ src: '', attrs: [] }
			]);
			done()
		})
	})

})
