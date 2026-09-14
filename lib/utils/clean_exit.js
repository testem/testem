
module.exports = function cleanExit(code) {
  // Workaround for this node core bug <https://github.com/joyent/node/issues/3584>
  // Instead of using `process.exit(?code)`, use this instead.
  // After terminal-kit grabInput, stdout.write('', cb) may never fire.

  let finished = false;
  function exit() {
    if (finished) {
      return;
    }
    finished = true;
    process.exit(code);
  }

  setTimeout(exit, 500);

  let streams = [process.stdout, process.stderr];
  let pending = streams.length;
  streams.forEach(stream => {
    const onDrained = () => {
      pending -= 1;
      if (pending <= 0) {
        exit();
      }
    };
    try {
      stream.write('', onDrained);
    } catch {
      onDrained();
    }
  });
};
