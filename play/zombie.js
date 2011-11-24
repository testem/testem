require.paths.unshift(__dirname + '/lib')

var Zombie = require('zombie'),
    Express = require('express'),
    Mustache = require('mustache.exp')
   
   
var server = Express.createServer() 
server.configure(function(){
    server.register(".html", Mustache)
    server.set("view options", {layout: false})
    server.use(Express.static(__dirname))
})

server.get('/', function(req, res){
    var scripts = [
        'hello.js', 'hello_spec.js']
    res.render('zombierunner.html', {
        locals: {scripts: scripts}
    })
})

server.listen(8080)
/*
var b = new Zombie.Browser()

function pollResults(browser){
    if (browser.window.tests.allResults){
        console.log(browser.window.tests.allResults)
        process.exit()
    }else
        setTimeout(function(){
            pollResults(browser)
        }, 500)
}

b.visit('http://localhost:8080/', function(err, browser){
    if (err){
        console.log(err.stack)
        process.exit()
    }
    pollResults(browser)
})
*/