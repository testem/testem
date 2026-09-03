const renderJasmine2 = require('./jasmine2');

const pages = {
  jasmine: renderJasmine2,
  jasmine2: renderJasmine2,
  qunit: require('./qunit'),
  mocha: require('./mocha'),
  'mocha+chai': require('./mocha_chai'),
  custom: require('./custom'),
  tap: require('./tap')
};

function renderRunner(framework, data) {
  const render = pages[framework];
  return render ? render(data) : null;
}

module.exports = {
  renderRunner,
  renderDirectoryListing: require('./directory')
};
