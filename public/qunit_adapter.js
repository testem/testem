QUnit.totalTests = 0
QUnit.totalTestsFailed = 0
QUnit._logs = []
QUnit._current = null
QUnit.log = function(params){
    if (!params.result && params.message)
        QUnit._logs.push({
            type: 'fail',
            name: QUnit._current.name,
            message: params.message
        })
}
QUnit.testStart = function(params){
    QUnit._current = params
}
QUnit.testDone = function(params){
    QUnit.totalTests++
    if (params.failed > 0)
        QUnit.totalTestsFailed++
    var test = {
        name: params.name,
        failed: params.failed,
        passed: params.passed,
        total: params.total
    }
    parent.socket.emit('test-result', test)
}
QUnit.done = function(params){
    var passed = QUnit.totalTests - QUnit.totalTestsFailed
    parent.socket.emit('all-test-results', {
        failed: QUnit.totalTestsFailed,
        passed: passed,
        total: QUnit.totalTests,
        runtime: params.runtime,
        items: QUnit._logs
    })
}