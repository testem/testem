var Q       = require("q"),
    request = require("request"),
    config  = require('./sauce-conf.js'),
    browser = config.browser,
    auth    = config.auth;

module.exports = function (data) {
  var deferred = Q.defer(),
      url  = ["/v1/", auth.username, "/jobs/", browser.sessionID].join("");

  request({
    method: "PUT",
    uri: ["https://", auth.username, ":", auth.accessKey, "@saucelabs.com/rest", url].join(""),
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  }, function (error, response, body) {
    deferred.resolve(response.body);
  });
  return deferred.promise;
};
