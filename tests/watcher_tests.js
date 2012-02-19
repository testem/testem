var FileWatcher = require('../lib/filewatcher.js')
  , test = require('./testutils.js')
  , async = require('async')
  , expect = test.expect
  

describe('FileWatcher', function(){
    var watcher
      , changed
    beforeEach(function(done){
        watcher = new FileWatcher
        changed = test.spy()
        watcher.on('changed', changed)
        test.refreshDataDir(done)
    })
    it('should add', function(){
        watcher.add(test.dataDir)
    })
    it('should watch for directory changes', function(done){
        test.log('dir changes')
        watcher.add(test.dataDir)
        async.series([function(next)
        { test.touchFile('blah.txt', next) }, function(next)
        { expect(changed.called).true
          done() }
        ])
    })
    it('should ignore(not blow up) if watched file does not exist' , function(){
        test.log('ignore')
        watcher.add('thisfiledoesnotexist')
    })
    it('should watch for file changes', function(done){
        async.series([function(next)
        { test.touchFile('blah.txt', next) }, function(next)
        { watcher.add(test.filePath('blah.txt')), next() }, function(next)
        { test.touchFile('blah.txt', next) }, function()
        { expect(changed.args[0]).to.be.eql(['change', test.filePath('blah.txt')])
          done() }
        ])
    })
    it('should watch glob patterns', function(done){
        async.series([function(next)
        { test.touchFile('one.txt', next) }, function(next)
        { test.touchFile('two.txt', next) }, function(next)
        { watcher.add(test.filePath('*.txt')), next() }, function(next)
        { test.touchFile('one.txt', next) }, function(next)
        { expect(changed.args[0])
              .to.be.eql(['change', test.filePath('one.txt')]), next() }, function(next)
        { test.touchFile('two.txt', next) }, function(next)
        { expect(changed.args[1])
              .to.be.eql(['change', test.filePath('two.txt')])
          done() }
        ])
    })
    
})