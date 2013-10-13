var async   = require('async'),
    config  = require('./sauce-conf.js'),
    api     = require('./sauce-rest-api-update-job-status.js'),
    browser = config.browser,
    auth    = config.auth,

    waitUntilResultsAreAvailable = function(js_script, timeout, start, callback) {
      var now = new Date();
      start = start || now;

      if (now - start > timeout) {
        callback( new Error("Timeout: Element not there") );
      } else {
        browser.eval(js_script, function(err, jsValue) {
          if (jsValue !== null) callback(null, {resultScript: jsValue});
          else waitUntilResultsAreAvailable(js_script, timeout, start, callback);
        });
      }
    };

module.exports = function(script_for_sauce_data_schemas, callback) {
  async.waterfall([

    function(callback) {
      waitUntilResultsAreAvailable(script_for_sauce_data_schemas, 15000, null, callback);
    },

    function(obj, callback) {
      var data = resultScript = obj.resultScript || {};
      data.passed = resultScript.passed || resultScript.failedCount === 0;

      if (data.passed) console.log("ok");
      else console.log("not ok");

      api(data).then( function(body) {
        obj.body = body;
        console.warn("Check out test results at http://saucelabs.com/jobs/" + browser.sessionID + "\n");
        callback(null, obj);
      });
    }
  ], function(err, result) {
    callback(err, result);
  });
};
