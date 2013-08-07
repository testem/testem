/**
 * JavaScript tests integration with Sauce
 * https://saucelabs.com/docs/javascript-unit-tests-integration
 */
var config  = require('./sauce-conf.js'),
    updateJobStatus = require('./sauce-update-job-status.js'),
    async   = require('async'),
    browser = config.browser,
    desired = config.desired;

module.exports = function(localhost_url, script_for_sauce_data_schemas, callback) {
  async.waterfall([
    function(callback) {
      browser.init(desired, function(err){
        callback(err);
      });
    },

    function(callback) {
      browser.get(localhost_url, function(err){
        callback(err);
      });
    },

    function(callback) {
      updateJobStatus(script_for_sauce_data_schemas, callback);
    },

    function(result, callback) {
      browser.quit(function(err){
        callback(err);
      });
    }

  ], function(err) {
    err && console.error('Caught exception: ' + err.stack);
    callback && callback(err);
  });
};
