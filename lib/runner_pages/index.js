const pages = {
  jasmine: require('./jasmine'),
  jasmine2: require('./jasmine2'),
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
