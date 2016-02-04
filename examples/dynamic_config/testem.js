var fs = require('fs');
var path = require('path');

var newTestFile = 'hello2_spec.js';
var newTestBody = 'describe("hello2", function() {\n' +
'  it("should say hello 2", function() {\n' +
'    expect(hello("2")).toBe("hello 2");\n' +
'  });\n' +
'});';

module.exports = {
  framework: 'jasmine',

  // executing js function as a hook
  // creating new js file before testing starts
  before_tests: function(config, data, callback) {
    fs.writeFile(path.join(__dirname, newTestFile), newTestBody, function(err) {
      callback(err);
    });
  },

  // and using regular string as a shell command
  // test the new file exists
  after_tests: 'test -f ' + newTestFile,

  // by default it sends all js files
  // so `testem.js` won't conflict with framework resource
  // explicitly specify test files
  "src_files": [
    "hello*.js"
  ]
}
