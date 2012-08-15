var tap = require('tap')
var BufferStream = require('bufferstream')
var stdout = new BufferStream([{encoding:'utf8', size:'none'}])
tapConsumer = new tap.Consumer
tapConsumer.on('data', function(data){
    console.log(data)
})
tapConsumer.on('end', function(err, count){
    console.log('tap end')
    console.log(err)
    console.log('count: ' + count)
})
tapConsumer.on('bailout', function(){
    console.log('tap bailout')
})
stdout.pipe(tapConsumer)
stdout.end('1..1\nok 1 foobar that')
setInterval(function(){}, 100)