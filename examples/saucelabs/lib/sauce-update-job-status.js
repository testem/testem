var async   = require('async'),
    Q       = require("q"),
    request = require("request"),
    config  = require('./sauce-conf.js'),
    browser = config.browser,
    auth    = config.auth,

    api = function (url, method, data) {
      var deferred = Q.defer();
      request({
        method: method,
        uri: ["https://", auth.username, ":", auth.accessKey, "@saucelabs.com/rest", url].join(""),
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
      }, function (error, response, body) {
        deferred.resolve(response.body);
      });
      return deferred.promise;
    },

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
      var data = resultScript = obj.resultScript || {},
          url  = ["/v1/", auth.username, "/jobs/", browser.sessionID].join("");
      data.passed = resultScript.passed || resultScript.failedCount === 0;

      api(url, "PUT", data).then( function(body) {
        obj.body = body;
        console.warn("Check out test results at http://saucelabs.com/jobs/" + browser.sessionID + "\n");
        callback(null, obj);
      });
    }
  ], function(err, result) {
    callback(err, result);
  });
};
