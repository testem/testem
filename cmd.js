#!/usr/bin/env node

require.paths.unshift(__dirname + '/lib')

require('socket.io.patch')

// Required modules
var Io = require('socket.io'),
    Express = require('express'),
    BrowserClient = require('browserclient'),
    SocketIO = require('socket.io'),
    Mustache = require('mustache.exp')
    
// Convience functions
var json = JSON.stringify,
    log = console.log,
    getMyIp = require('getipaddr')
    


// Build the server
var server = Express.createServer()
// a list of connected browser clients
server.browsers = []

// App config
var config = server.config = {
    dotfile: process.env.HOME + '/.testem',
    port: 3580
}

// serve static files on ./public
server.configure(function(){
    server.register(".html", Mustache)
    server.set("view options", {layout: false})
    server.use(Express.static(__dirname + '/public'))
})

server.get('/runner/', function(req, res){
    var scripts = ['/jasmine.js', '/jasmine-html.js', 
        '/jasmine_adapter.js',
        'hello.js', 'hello_spec.js'],
        css = ['/jasmine.css']
    res.render('runner.html', {
        locals: {scripts: scripts, css: css}
    })
})

server.get(/^\/runner\/(.+)$/, function(req, res){
    var path = req.params[0]
    res.sendfile(path)
})

// Create socket.io sockets
var io = SocketIO.listen(server)
io.sockets.on('connection', function(client){
    client.emit('connect')
    client.on('browserlogin', function(browserName){
        process.stdout.write('\r' + browserName + ' joined.           \n')
        promptToRunTests()
        client.testsCompleted = 0
        client.name = browserName
        server.browsers.push(client)
        //client.emit('starttests')
    })
    client.on('tests-start', function(){
        console.log('\nProgress')
        console.log(server.browsers.map(function(b){
            return b.name
        }).join('\t'))
    })
    client.on('test-result', function(result){
        client.testsCompleted++
        process.stdout.write('\r' + server.browsers.map(function(b){
            return b.testsCompleted
        }).join('\t\t') + '\n')
    })
    client.on('all-test-results', function(results){
        client.results = results
        console.log('\nTest Results')
        server.browsers.forEach(function(b){
            if (!b.results) return
            console.log(b.name)
            console.log('  ', b.results.total, 'tests ran.', b.results.failed, 'failed.')
        })
        console.log()
        promptToRunTests()
    })
})

// Start the server!
server.listen(config.port)
getMyIp(function(err, ip){
    config.myIp = ip
    log("Howdy! Let's test'em 'scripts!\n")
    log('Open this URL in the browser(s) you want to test')
    log('    http://' + ip + ':' + config.port + '/\n')
    
    promptToRunTests()
}, false)

// Thank you <http://st-on-it.blogspot.com/2011/05/how-to-read-user-input-with-nodejs.html>
function ask(question, callback) {
    var stdin = process.stdin, 
        stdout = process.stdout
    
    stdin.resume()
    stdout.write(question)
    
    stdin.once('data', function(data) {
        data = data.toString().trim()
        callback(data)
    })
}

function promptToRunTests(){
    ask('[Press ENTER to run tests]', function(data){
        console.log('Running tests.')
        server.browsers.forEach(function(b){
            b.emit('starttests')
        })
    })
}


