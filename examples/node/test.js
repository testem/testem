var test = require("testling")
    , hello = require("./hello")

test("hello world", function (t) {
    t.equal("hello world", hello())

    t.end()
})