function footerHelp({ hasRunners, paused }) {
  const pauseStatus = paused ? '; p to unpause (PAUSED)' : '; p to pause';
  const msg = hasRunners
    ? 'Press ENTER to run tests; q to quit'
    : 'q to quit';
  return '[' + msg + pauseStatus + ']';
}

module.exports = {
  footerHelp
};
