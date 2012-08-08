var exec = require('child_process').exec
var tap = require('tap')

var p = exec('mocha mocha_tests.js -R tap')

tapConsumer = new tap.Consumer
tapConsumer.on('data', function(data, ){
    if (typeof data === 'string'){
        console.log('STRING ' + data)
    }else{
        console.log('OBJECT ' + JSON.stringify(data))
    }
})
tapConsumer.on('end', function(){
    console.log('TAP stream ended.')
})
tapConsumer.on('bailout', function(){
    console.log('Bailed out!')
})

p.stdout.pipe(tapConsumer)