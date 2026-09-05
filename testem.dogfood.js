module.exports = {
  // The Mocha tab runs the unit suite, and tests/ci/ci_tests.js binds the
  // default 7357 on purpose. Leave that port free or the suite wedges there.
  port: 7400,
  test_page: 'tests/fixtures/dogfood_browser/test.html',
  src_files: ['tests/fixtures/dogfood_browser/*.js'],
  launchers: {
    Mocha: {
      command: 'npx mocha tests/*_tests.js tests/**/*_tests.js -R tap',
      protocol: 'tap'
    }
  },
  launch_in_dev: ['Chrome', 'Firefox', 'Safari', 'Mocha']
};
