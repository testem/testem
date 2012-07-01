(function () {
    var Buffer = {
        _stack: []
        , add: function () {
            var args = [].slice.call(arguments)
            if (this._listener) {
                return this._listener.call(null, args)
            }
            this._stack.push(args)
        }
        , listen: function (f) {
            this._listener = f
            this._stack.forEach(function (args) {
                f.call(null, args)
            })
            this._stack = []
        }
    }

    var results = {
        failed: 0
        , passed: 0
        , total: 0
        , tests: []
    }
    var id = 1

    window.customAdapter = customAdapter
    window.test = test
    window.assert = assert

    function customAdapter(socket) {
        Buffer.listen(function (args) {
            socket.emit.apply(socket, args)
        })
    }

    function test(name, fn) {
        setTimeout(function  () {
            var passed = true
                , tst = {
                    passed: 0
                    , failed: 0
                    , total: 1
                    , id: id++
                    , name: name
                    , items: []
                }

            Buffer.add("tests-start")

            try {
                fn()
            } catch (err) {
                tst.items.push({
                    passed: false
                    , message: err.message
                    , stacktrace: err.stack ? err.stack : undefined
                })
                passed = false
            }

            if (passed) {
                results.passed++
                tst.passed++
            } else {
                results.failed++
                tst.failed++
            }

            results.total++
            results.tests.push(tst)
            Buffer.add("test-result", tst)

            Buffer.add("all-tests-results", results)
        }, 1000)
    }

    function assert(bool, message) {
        if (!bool) {
            throw new Error(message)
        }
    }
}())