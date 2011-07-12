QUnit.totalTests = 0
QUnit.totalTestsFailed = 0
QUnit.testDone = function(params){
    QUnit.totalTests++
    if (params.failed > 0)
        QUnit.totalTestsFailed++
    Tutti.sendData({
        test: 'caseResult', 
        name: params.name,
        failed: params.failed,
        passed: params.passed,
        total: params.total
    })
}

QUnit.done = function(params){
    var passed = QUnit.totalTests - QUnit.totalTestsFailed
    Tutti.sendData({
        test: 'done',
        failed: QUnit.totalTestsFailed,
        passed: passed,
        total: QUnit.totalTests,
        runtime: params.runtime
    })
}