var browserify = require('browserify');

module.exports = function (testFiles) {
    var bundle = browserify();
    testFiles.forEach(function (file) {
        bundle.addEntry(file);
    });
    return bundle.bundle();
};
