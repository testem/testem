!function(){

function emit(){
    var socket = parent.socket
    socket.emit.apply(socket, arguments)
}
window.onerror = function(msg, url, line){
    emit('error', msg, url, line)
}
function JasmineAdapterReporter(){}
JasmineAdapterReporter.prototype.reportRunnerStarting = function(runner){
    emit('tests-start')
}
JasmineAdapterReporter.prototype.reportSuiteResults = function(suite){
}
JasmineAdapterReporter.prototype.reportSpecStarting = function(spec){
}
JasmineAdapterReporter.prototype.reportSpecResults = function(spec){
    var results = spec.results(),
        rItems = results.getItems(),
        numItems = rItems.length,
        items = []
    for (var i = 0; i < numItems; i++){
        var item = rItems[i]
        if (item.type === 'log')
            items[i] = {type: 'log', message: String(item)}
        else if (item.type == 'expect' && item.passed && !item.passed()){
            items[i] = {type: 'fail', message: item.message}
        if (item.trace.stack)
                items[i].stackTrace = item.trace.stack
        }
    }
    emit('test-result', {
        items: items,
        passed: results.passed(),
        spec: spec.getFullName()
    })
}
JasmineAdapterReporter.prototype.reportRunnerResults = function(runner){
    var output = [],
        results = runner.results(),
        specs = runner.specs(),
        failed = results.failedCount,
        total = specs.length,
        passed = total - failed,
        msg = {
            failed: failed,
            total: total,
            passed: passed,
            items: []}

    
    for (var i = 0; i < specs.length; i++) {
        var spec = specs[i]
        var results = spec.results()
        if (results.failedCount > 0){
            var items = results.getItems()
            var numItems = items.length
            for (var j = 0; j < numItems; j++){
                var result = items[j]
                if (result.type == 'log')
                    msg.items.push({
                        type: 'log', message: result.toString()})
                else if (result.type == 'expect' && 
                    result.passed && !result.passed()){
                    if (result.trace.stack)
                        parent.result = result
                    msg.items.push({
                        type: 'fail',
                        name: spec.getFullName(),
                        message: result.message,
                        stackTrace: result.trace.stack
                    })
                }
            }
        }
    }
    emit('all-test-results', msg)
}
jasmine.getEnv().addReporter(new JasmineAdapterReporter)

}()