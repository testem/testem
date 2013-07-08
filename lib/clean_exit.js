function exit(code) {
  // Workaround for this node core bug <https://github.com/joyent/node/issues/3584>
  // Instead of using `process.exit(?code)`, use this instead.
  //
  // Wait for stdout and stderr to "drain" before exiting
  var draining = 0
  var onDrain = function() {
    if (!draining--) process.exit(code)
  }
  if (process.stdout.bufferSize) {
    draining++
    process.stdout.once('drain', onDrain)
  }
  if (process.stderr.bufferSize) {
    draining++
    process.stderr.once('drain', onDrain)
  }
  if (!draining) process.exit(code)
}

module.exports = exit
