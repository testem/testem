var appview = require('../lib/appview.js')
  , test = require('./testutils.js')
  , EventEmitter = require('events').EventEmitter
  , expect = test.expect
  , async = require('async')
  , Backbone = require('backbone')

describe('Spinner', function(){
	it('should create', function(){
		var spinner = new appview.Spinner(4, 5)
		expect(spinner.get('line')).to.equal(4)
		expect(spinner.get('col')).to.equal(5)
	})

	describe('spinning', function(){
		var spinner
		beforeEach(function(){
			spinner = new appview.Spinner(4, 5)
		})
		it('should start and stop', function(done){
			var position, write
			spinner.charm = {
				position: position = test.spy()
				, write: write = test.spy()
			}
			spinner.start()
			expect(position.calledWith(4, 5)).to.be.ok
			

			async.series([function(next)

			{ expect(write.calledWith('-')).to.be.ok, setTimeout(next, 200) }, function(next)
			{ expect(write.calledWith('\\')).to.be.ok, setTimeout(next, 200) }, function(next)
			{ expect(write.calledWith('|')).to.be.ok, setTimeout(next, 200) }, function(next)
			{ expect(write.calledWith('/')).to.be.ok, setTimeout(next, 200) }, function(next)
			{ expect(write.calledWith('-')).to.be.ok, next() }, function(next)
			{
				expect(write.callCount).to.equal(5)
				spinner.stop()
				setTimeout(next, 200)
			}, function(next)
			{
				expect(write.callCount).to.equal(5) // still 5
				done()
			}

			])
		})
	})
})

describe('BrowserTab', function(){
	var tab, browser, app, position, write, results
	beforeEach(function(){
		position = test.spy()
		write = test.spy()
		app = new Backbone.Model()
		browser = new Backbone.Model({
			results: results = new Backbone.Collection
		})
		tab = new appview.BrowserTab(browser, 0, app)
		tab.charm = {
			position: position
			, write: write
		}
	})
	it('should be unselected', function(){
		expect(tab.get('selected')).to.not.be.ok
	})
	it('should render unselected if unselected', function(){
		test.spy(tab, 'renderUnselected')
		test.spy(tab, 'renderSelected')
		tab.renderTab()
		expect(tab.renderUnselected.callCount).to.equal(1)
		expect(tab.renderSelected.callCount).to.equal(0)
	})
	it('should render selected if selected', function(){
		test.spy(tab, 'renderUnselected')
		test.spy(tab, 'renderSelected')
		tab.set('selected', true, {silent: true})
		tab.renderTab()
		expect(tab.renderUnselected.callCount).to.equal(0)
		expect(tab.renderSelected.callCount).to.equal(1)
	})
	it('should re-render tab if select changed', function(){
		test.spy(tab, 'renderTab')
		tab.set('selected', true)
		expect(tab.renderTab.callCount).to.equal(1)
	})
	it('should render browser name if browser name changed', function(){
		test.spy(tab, 'renderBrowserName')
		browser.set('name', 'IE 9.0')
		expect(tab.renderBrowserName.callCount).to.equal(1)
	})
	it('should render results if results changed', function(){
		test.spy(tab, 'renderResults')
		results.add(new Backbone.Model)
		expect(tab.renderResults.callCount).to.equal(1)
	})
})

describe('LogPanel', function(){
	var logPanel, charm, position, write
	beforeEach(function(){
		charm = {
			position: position = test.spy()
			, write: write = test.spy()
		}
		logPanel = new appview.LogPanel(6, 1, 100, 50)
		logPanel.charm = charm
	})
	it('has line, col, height, width and text properties', function(){
		expect(logPanel.get('line')).to.equal(6)
		expect(logPanel.get('col')).to.equal(1)
		expect(logPanel.get('height')).to.equal(100)
		expect(logPanel.get('width')).to.equal(50)
		expect(logPanel.get('text')).to.equal('')
	})
	it('re-renders on change', function(){
		test.spy(logPanel, 'render')
		logPanel.set('text', 'blah')
		expect(logPanel.render.callCount).to.equal(1)
	})
	it('draws text starting first line', function(){
		logPanel.set('text', 'blah')
		expect(position.calledWith(6, 1)).to.be.ok
		expect(write.calledWith('blah')).to.be.ok
	})
	it('breaks multi-line text into multiple writes', function(){
		logPanel.set('text', 'line 1\nline 2\nline 3')
		expect(position.calledWith(6, 1)).to.be.ok
		expect(write.calledWith('line 1')).to.be.ok
		expect(position.calledWith(7, 1)).to.be.ok
		expect(write.calledWith('line 2')).to.be.ok
		expect(position.calledWith(8, 1)).to.be.ok
		expect(write.calledWith('line 3')).to.be.ok
	})
	it('can scroll vertically (positive)', function(){
		logPanel.set({
			text: 'line 1\nline 2\nline 3'
			, vertScrollOffset: 1
		})
		expect(write.calledWith('line 1')).not.to.be.ok
	})
})