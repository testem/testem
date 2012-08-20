var path = require('path')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var p = exec(path.join('node_modules', '.bin', 'mocha') + ' tests.js -R tap')
p.stdout.on('data', function(data){
    process.stdout.write(data + '')
})
p.stderr.on('data', function(data){
    process.stderr.write(data + '')
})
p.on('exit', function(){
    process.exit(0)
})
setInterval(function(){}, 1000)