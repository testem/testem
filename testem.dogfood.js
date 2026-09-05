module.exports = {
  test_page: 'examples/mocha_simple/test.html',
  src_files: ['examples/mocha_simple/*.js'],
  // GUI browsers (not Headless Chrome / Headless Firefox). Temp profiles
  // open a separate window — --new-window / -foreground make that visible.
  browser_args: {
    Chrome: ['--new-window', '--window-position=80,80', '--window-size=1100,800'],
    Firefox: ['-new-window', '-foreground']
  },
  launchers: {
    Mocha: {
      // npm expands the same globs as `npm test`. Passing them through
      // spawnargs + execa leaves tests/*_tests.js unexpanded and mocha
      // reports 0/0.
      command: 'npm test -- --reporter tap',
      protocol: 'tap'
    }
  },
  launch_in_dev: ['Chrome', 'Firefox', 'Safari', 'Mocha']
};
