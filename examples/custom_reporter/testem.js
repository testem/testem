var MyReporter = require('./my-reporter');

module.exports = {
    "framework": "mocha+chai",
    "src_files": [
      "hello*.js",
    ],
    "reporter": new MyReporter()
};
