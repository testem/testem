var launcher = require('sauce-connect-launcher'),
    config   = require('./sauce-conf.js'),
    integrationTest = require('./sauce-javascript-tests-integration.js');

launcher(config.launcherOptions, function (err, sauceConnectProcess) {
  console.log("Started Sauce Connect Process");

  integrationTest(
    "http://localhost:8080",
    "{failedCount: jasmine.currentEnv_.currentRunner_.results().failedCount}",

    function() {
      sauceConnectProcess.close(function () {
        console.log("Closed Sauce Connect process");
      });
    }

  );
});
