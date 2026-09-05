module.exports = {
  test_page: 'examples/mocha_simple/test.html',
  src_files: ['examples/mocha_simple/*.js'],
  launchers: {
    Mocha: {
      command: 'npx mocha --timeout 3000 tests/*_tests.js tests/**/*_tests.js -R tap',
      protocol: 'tap'
    }
  },
  launch_in_dev: ['Chrome', 'Firefox', 'Safari', 'Mocha']
};
