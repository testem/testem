/*

mocha_adapter.js
================

Testem`s adapter for Mocha. It works by monkey-patching `Runner.prototype.emit`.

*/

function mochaAdapter(socket){

	var results = 
		{ failed: 0
	    , passed: 0
	    , total: 0
	    , tests: []
		}
	var id = 1

	function emit(){
	    socket.emit.apply(socket, arguments)
	}

	window.onerror = function(msg, url, line){
	    emit('top-level-error', msg, url, line)
	}

	var oEmit = mocha.Runner.prototype.emit
	mocha.Runner.prototype.emit = function(evt, test){
	 	if (evt === 'start'){
			emit('tests-start')
		}else if (evt === 'end'){
			emit('all-test-results', results)
		}else if (evt === 'test end'){
			if (test.state === 'passed'){
				var tst = 
					{ passed: 1
					, failed: 0
					, total: 1
					, id: id++
					, name: test.title
					, items: []
					}
				results.passed++
				results.total++
				results.tests.push(tst)
				emit('test-result', tst)
			}else if (test.state === 'failed'){
				var items = [
					{ passed: false
					, message: test.err.message
					, stacktrace: (test.err && test.err.stack) ? test.err.stack : undefined
					}
				]
				var tst = 
					{ passed: 0
					, failed: 1
					, total: 1
					, id: id++
					, name: test.title
					, items: items
					}
				results.failed++
				results.total++
				results.tests.push(tst)
				emit('test-result', tst)
			}
		}
		oEmit.apply(this, arguments)
	}

}

