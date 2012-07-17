var testlingStream = require("testling").stream
    , adapterStream = require("testem-testling-adapter")

testlingStream.pipe(adapterStream)