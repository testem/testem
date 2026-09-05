module.exports = {
  // Dedicated port: unit tests bind 7357; dogfood uses 7400.
  port: 7401,
  disable_watching: true,
  launchers: {
    Fixture: {
      command: 'node tests/fixtures/tui_e2e/pass.js',
      protocol: 'tap'
    }
  },
  launch_in_dev: ['Fixture']
};
