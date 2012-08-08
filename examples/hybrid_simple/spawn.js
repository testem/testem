var child_process = require('child_process')

//var p = child_process.spawn('mocha', ['tests.js', '-R', 'tap'])

var p = child_process.exec('mocha tests.js -R tap')

var dataItems = []

p.stdout.on('data', function(data){
    dataItems.push('out: ' + data.toString())
})

p.stderr.on('data', function(data){
    dataItems.push('err: ' + data.toString())
})

p.on('exit', function(){
    console.log(dataItems)
    process.exit()
})