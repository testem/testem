/*

buster_adapter.js
=================

Testem's adapter for Buster.js. It works by attaching event listeners to the test runner.


*/

function busterAdapter(socket){

    function emit(){
        socket.emit.apply(socket, arguments)
    }

    var results = {
        failed: 0
        , passed: 0
        , total: 0
        , tests: []
    }

    var runner = buster.testRunner
    var currContext = null

    runner.on('context:start', function(context){
        currContext = context
    })
    runner.on('context:end', function(){
        currContext = null
    })

    runner.on('test:success', function(test){
        console.log('test success')
        console.log(test)
    })

    runner.on('test:failure', function(){
        console.log('test failure')
        printArgs(arguments)
    })

    runner.on('test:error', function(){
        console.log('test error')
        printArgs(arguments)
    })

    runner.on('test:timeout', function(){
        console.log('timeout')
        printArgs(arguments)
    })

    runner.on('suite:end', function(){
        console.log('suite ended')
    })

}