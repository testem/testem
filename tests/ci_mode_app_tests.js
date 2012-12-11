var CiModeApp = require('../lib/ci_mode_app')

describe('ci_mode_app', function() {
  beforeEach(function() {
    // Create a config with multiple mock launchers
  })

  it('should launch browsers in parallel', function() {
    // Create a new app
  })

  it('should not stop when all runners finished but #runners < #launchers', function() {

  })

  it('should not stop when #runners >= #launchers but not all runners finished ', function() {

  })

  it('should stop when #runners >= #launchers AND all runners finished ', function() {

  })

  it('stops after timeout, even if runners are not finished', function() {

  })

  it('writes test results to stdout when complete', function() {

  })
});
