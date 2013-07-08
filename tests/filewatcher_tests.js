var FileWatcher = require('../lib/filewatcher.js')
var test = require('./testutils.js')
var async = require('async')
var expect = require('chai').expect
var spy = require('ispy')

describe('FileWatcher', function(){
  var watcher
    , changed
  beforeEach(function(done){
    watcher = new FileWatcher
    changed = spy()
    watcher.on('change', changed)
    test.refreshDataDir(done)
  })
    
  it('should add', function(){
    watcher.add(test.dataDir)
  })
    
  it('should ignore(not blow up) if watched file does not exist' , function(){
    watcher.add('thisfiledoesnotexist')
  })
  it('should watch for file changes', function(done){
    async.series([function(next)
        
    { test.touchFile('blah.txt', next) }, function(next)
    { setTimeout(next, 500) }, function(next)
    { watcher.add(test.filePath('blah.txt')), next() }, function(next)
    { setTimeout(next, 500) }, function(next)
    { test.touchFile('blah.txt', next) }, function(next)
    { setTimeout(next, 500) }, function(next)
    { expect(changed.lastCall.args).to.deep.equal([test.filePath('blah.txt')]), done()}
        
    ])
  })
  it('should not trigger changed when only accessed', function(done){
    async.series([function(next)
        
    { test.touchFile('blah.txt', next) }, function(next)
    { watcher.add(test.filePath('blah.txt')), next() }, function(next)
    { setTimeout(next, 200) }, function(next)
    { test.accessFile('blah.txt', next) }, function(next)
    { setTimeout(next, 200) }, function(next)
    { expect(changed.called).to.not.be.ok; done() }
        
    ])        
  })
  it('stops watching once you clear', function(done){
    async.series([function(next)
        
    { test.touchFile('blah.txt', next) }, function(next)
    { setTimeout(next, 500) }, function(next)
    { watcher.add(test.filePath('blah.txt')), next() }, function(next)
    { setTimeout(next, 500) }, function(next)
    { watcher.clear(), next() }, function(next)
    { test.touchFile('blah.txt', next) }, function(next)
    { setTimeout(next, 500) }, function(next)
    { expect(changed.called).to.not.be.ok, done()}
        
    ])
  })
    
})
