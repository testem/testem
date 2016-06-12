## About

This example demonstrates how to pass metadata from your test run back to a custom reporter. We
will count the number of times that the jQuery ajax method is called and summarize that
information in the console.

## Setup

First install dependencies

    npm install

Then, just run tests

    npm test

Observe that the output has extra, custom information.

## How it Works

In a custom adapter running in the browser with your tests, emit an event named
`test-result-metadata` with two arguments. The first argument is a tag that categorizes the
metadata, while the second argument is the metadata.

    socket.emit('test-result-metadata', 'ajax-count', { /* metadata */ });

In your custom reporter, a function named `reportMetadata` will be called and given the tag and
the metadata.

    AjaxCountingReporter.prototype.reportMetadata = function(tag, metadata) {
      if (tag === 'ajax-count') {
        // do something
      }
    }

If your metadata object is deep enough that it is truncated when the reporter receives it, you
can increase the maximum depth before truncation. Back inside of your adapter, configure the
`socket` that it has access to.

    socket.eventMaxDepth = /* positive integer */;

That's it!
