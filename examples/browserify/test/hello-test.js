var hello = require("../hello")
    , test = require("testling")

test("hello", function (t) {
    t.equal(hello(), "hello world")

    t.end()
})