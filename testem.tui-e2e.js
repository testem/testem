module.exports = {
  // Dedicated port: unit tests bind 7357; dogfood uses 7400.
  port: 7401,
  disable_watching: true,
  launchers: {
    Alpha: {
      command: 'node tests/fixtures/tui_e2e/alpha.js',
      protocol: 'tap'
    },
    Beta: {
      command: 'node tests/fixtures/tui_e2e/beta.js',
      protocol: 'tap'
    },
    Long: {
      command: 'node tests/fixtures/tui_e2e/long.js',
      protocol: 'tap'
    },
    Hang: {
      command: 'node tests/fixtures/tui_e2e/hang.js',
      protocol: 'tap'
    }
  },
  launch_in_dev: ['Alpha', 'Beta']
};
