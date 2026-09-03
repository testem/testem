const fs = require('fs');
const path = require('path');

const CDN = {
  mochaJs: '//cdnjs.cloudflare.com/ajax/libs/mocha/2.3.4/mocha.js',
  mochaCss: '//cdnjs.cloudflare.com/ajax/libs/mocha/2.3.4/mocha.css',
  chaiJs: '//cdnjs.cloudflare.com/ajax/libs/chai/3.4.1/chai.js',
  jasmineJs: '//cdnjs.cloudflare.com/ajax/libs/jasmine/2.4.1/jasmine.js',
  jasmineHtml: '//cdnjs.cloudflare.com/ajax/libs/jasmine/2.4.1/jasmine-html.js',
  jasmineBoot: '//cdnjs.cloudflare.com/ajax/libs/jasmine/2.4.1/boot.js',
  jasmineCss: '//cdnjs.cloudflare.com/ajax/libs/jasmine/2.4.1/jasmine.css',
  qunitJs: '//code.jquery.com/qunit/qunit-1.20.0.js',
  qunitCss: '//code.jquery.com/qunit/qunit-1.20.0.css'
};

function existsInCwdNodeModules(cwd, relPath) {
  return fs.existsSync(path.resolve(cwd, 'node_modules', relPath));
}

function resolveAsset(cwd, relPath, fallbackUrl) {
  if (existsInCwdNodeModules(cwd, relPath)) {
    return '/node_modules/' + relPath.replace(/\\/g, '/');
  }
  return fallbackUrl;
}

function resolveRunnerFrameworkAssets(cwd) {
  cwd = cwd || process.cwd();

  const mochaJs = resolveAsset(cwd, 'mocha/mocha.js', CDN.mochaJs);
  const mochaCss = resolveAsset(cwd, 'mocha/mocha.css', CDN.mochaCss);
  const chaiLocal = existsInCwdNodeModules(cwd, 'chai/index.js') &&
    mochaJs.indexOf('/node_modules/') === 0;

  const jasmineCoreV5 = existsInCwdNodeModules(cwd, 'jasmine-core/lib/jasmine-core/jasmine.js') &&
    existsInCwdNodeModules(cwd, 'jasmine-core/lib/jasmine-core/boot0.js');

  return {
    mochaJs,
    mochaCss,
    chaiLocal,
    chaiJs: chaiLocal ? '/node_modules/chai/index.js' : CDN.chaiJs,
    jasmineCoreV5,
    jasmineJs: jasmineCoreV5
      ? '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js'
      : CDN.jasmineJs,
    jasmineHtml: jasmineCoreV5
      ? '/node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js'
      : CDN.jasmineHtml,
    jasmineBoot: jasmineCoreV5 ? null : CDN.jasmineBoot,
    jasmineCss: jasmineCoreV5
      ? '/node_modules/jasmine-core/lib/jasmine-core/jasmine.css'
      : CDN.jasmineCss,
    qunitJs: resolveAsset(cwd, 'qunit/qunit/qunit.js', CDN.qunitJs),
    qunitCss: resolveAsset(cwd, 'qunit/qunit/qunit.css', CDN.qunitCss)
  };
}

module.exports = {
  CDN,
  resolveRunnerFrameworkAssets
};
