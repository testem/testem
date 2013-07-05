function exit(process, code) {
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

exports.exit = exit
