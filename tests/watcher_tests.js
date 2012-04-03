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
        watcher.on('change', changed)
        test.refreshDataDir(done)
    })
    
    it('should add', function(){
        watcher.add(test.dataDir)
    })
    
    it('should watch for directory changes', function(done){
        watcher.add(test.dataDir)
        async.series([function(next)
        
        { setTimeout(next, 200) }, function(next)
        { debugger; test.touchFile('blah.txt', next) }, function(next)
        { setTimeout(next, 200) }, function(next)
        { debugger; expect(changed.called).to.equal(true); done() }
        
        ])
    })
    
    it('should ignore(not blow up) if watched file does not exist' , function(){
        watcher.add('thisfiledoesnotexist')
    })
    it('should watch for file changes', function(done){
        async.series([function(next)
        
        { test.touchFile('blah.txt', next) }, function(next)
        { watcher.add(test.filePath('blah.txt')), next() }, function(next)
        { setTimeout(next, 200) }, function(next)
        { test.touchFile('blah.txt', next) }, function(next)
        { setTimeout(next, 200) }, function(next)
        { expect(changed.args[0]).to.be.eql(['change', test.filePath('blah.txt')]), done()}
        
        ])
    })
    it('should not trigger changed when only accessed', function(done){
        async.series([function(next)
        
        { test.touchFile('blah.txt', next) }, function(next)
        { watcher.add(test.filePath('blah.txt')), next() }, function(next)
        { setTimeout(next, 200) }, function(next)
        { test.accessFile('blah.txt', next) }, function(next)
        { setTimeout(next, 200) }, function(next)
        { expect(changed.callCount).to.equal(0); done() }
        
        ])        
    })
    it('should watch glob patterns', function(done){
        async.series([function(next)
        
        { test.touchFile('one.txt', next) }, function(next)
        { test.touchFile('two.txt', next) }, function(next)
        { watcher.add(test.filePath('*.txt')), next() }, function(next)
        { setTimeout(next, 200) }, function(next)
        { test.touchFile('one.txt', next) }, function(next)
        { setTimeout(next, 200) }, function(next)
        { expect(changed.args[0])
              .to.be.eql(['change', test.filePath('one.txt')]), next() }, function(next)
        { test.touchFile('two.txt', next) }, function(next)
        { setTimeout(next, 200) }, function(next)
        { expect(changed.args[1])
              .to.be.eql(['change', test.filePath('two.txt')])
          done() }
    
        ])
    })
    
    /*
    it('should watch wild cards', function(done){
        test.log('wild cards')
        async.series([function(next)
        
        { watcher.add(test.filePath('folder/*.txt')); next() }, function(next)
        { setTimeout(next, 200) }, function(next)
        { test.mkdir('folder', next) }, function(next)
        { test.mkdir('folder2', next) }, function(next)
        { test.touchFile('folder/one.txt', next) }, function(next)
        { test.touchFile('folder2/two.txt', next) }, function(next)
        { expect(changed.args[0])
                .to.be.eql(['change', test.filePath('folder/one.txt')])
          expect(changed.args[1])
                .to.be.eql(['change', test.filePath('folder2/two.txt')])
          done() }
          
        ])
    })
    */
    
})