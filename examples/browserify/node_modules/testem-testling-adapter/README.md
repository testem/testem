# Testem adapter for testling

A custom adapter for testling and testem

## Example

    // In your unit test code using testem
    var test = require("testling")
        , adapterStream = require("testem-testling-adapter")

    test.stream.pipe(adapterStream)