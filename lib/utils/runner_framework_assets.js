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

const JASMINE_JS = 'jasmine-core/lib/jasmine-core/jasmine.js';
const JASMINE_HTML = 'jasmine-core/lib/jasmine-core/jasmine-html.js';
const JASMINE_CSS = 'jasmine-core/lib/jasmine-core/jasmine.css';
const JASMINE_BOOT0 = 'jasmine-core/lib/jasmine-core/boot0.js';
const JASMINE_BOOT1 = 'jasmine-core/lib/jasmine-core/boot1.js';
const JASMINE_BOOT = 'jasmine-core/lib/jasmine-core/boot.js';

function nodeModulesUrl(relPath) {
  return '/node_modules/' + relPath.replace(/\\/g, '/');
}

function nodeModulesDirs(cwd, routes) {
  const dirs = [path.resolve(cwd, 'node_modules')];
  const routesObj = routes || {};
  ['/node_modules', '/node_modules/'].forEach(prefix => {
    if (!(prefix in routesObj)) {
      return;
    }
    [].concat(routesObj[prefix]).forEach(target => {
      dirs.push(path.resolve(cwd, target));
    });
  });
  return dirs;
}

function existsInNodeModules(dirs, relPath) {
  return dirs.some(dir => fs.existsSync(path.join(dir, relPath)));
}

function findInNodeModules(dirs, relPath) {
  for (let i = 0; i < dirs.length; i++) {
    const full = path.join(dirs[i], relPath);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return null;
}

function resolveAsset(dirs, relPath, fallbackUrl) {
  if (existsInNodeModules(dirs, relPath)) {
    return nodeModulesUrl(relPath);
  }
  return fallbackUrl;
}

function isChaiEsm(dirs) {
  const pkgPath = findInNodeModules(dirs, 'chai/package.json');
  if (!pkgPath) {
    return false;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.type === 'module';
  } catch {
    return false;
  }
}

function resolveChai(dirs, mochaLocal) {
  if (!mochaLocal) {
    return { chaiLocal: false, chaiJs: CDN.chaiJs };
  }
  if (existsInNodeModules(dirs, 'chai/chai.js')) {
    return { chaiLocal: false, chaiJs: nodeModulesUrl('chai/chai.js') };
  }
  if (existsInNodeModules(dirs, 'chai/index.js') && isChaiEsm(dirs)) {
    return { chaiLocal: true, chaiJs: nodeModulesUrl('chai/index.js') };
  }
  return { chaiLocal: false, chaiJs: CDN.chaiJs };
}

function resolveJasmine(dirs) {
  const hasCore = existsInNodeModules(dirs, JASMINE_JS) &&
    existsInNodeModules(dirs, JASMINE_HTML) &&
    existsInNodeModules(dirs, JASMINE_CSS);
  const jasmineCoreV5 = hasCore &&
    existsInNodeModules(dirs, JASMINE_BOOT0) &&
    existsInNodeModules(dirs, JASMINE_BOOT1);
  const jasmineLegacy = hasCore &&
    existsInNodeModules(dirs, JASMINE_BOOT) &&
    !jasmineCoreV5;

  if (jasmineCoreV5) {
    return {
      jasmineCoreV5: true,
      jasmineJs: nodeModulesUrl(JASMINE_JS),
      jasmineHtml: nodeModulesUrl(JASMINE_HTML),
      jasmineCss: nodeModulesUrl(JASMINE_CSS),
      jasmineBoot: null
    };
  }
  if (jasmineLegacy) {
    return {
      jasmineCoreV5: false,
      jasmineJs: nodeModulesUrl(JASMINE_JS),
      jasmineHtml: nodeModulesUrl(JASMINE_HTML),
      jasmineCss: nodeModulesUrl(JASMINE_CSS),
      jasmineBoot: nodeModulesUrl(JASMINE_BOOT)
    };
  }
  return {
    jasmineCoreV5: false,
    jasmineJs: CDN.jasmineJs,
    jasmineHtml: CDN.jasmineHtml,
    jasmineCss: CDN.jasmineCss,
    jasmineBoot: CDN.jasmineBoot
  };
}

function resolveRunnerFrameworkAssets(cwd, routes) {
  cwd = cwd || process.cwd();
  const dirs = nodeModulesDirs(cwd, routes);

  const mochaJs = resolveAsset(dirs, 'mocha/mocha.js', CDN.mochaJs);
  const mochaCss = resolveAsset(dirs, 'mocha/mocha.css', CDN.mochaCss);
  const mochaLocal = mochaJs.indexOf('/node_modules/') === 0;
  const chai = resolveChai(dirs, mochaLocal);
  const jasmine = resolveJasmine(dirs);

  return {
    mochaJs,
    mochaCss,
    chaiLocal: chai.chaiLocal,
    chaiJs: chai.chaiJs,
    jasmineCoreV5: jasmine.jasmineCoreV5,
    jasmineJs: jasmine.jasmineJs,
    jasmineHtml: jasmine.jasmineHtml,
    jasmineBoot: jasmine.jasmineBoot,
    jasmineCss: jasmine.jasmineCss,
    qunitJs: resolveAsset(dirs, 'qunit/qunit/qunit.js', CDN.qunitJs),
    qunitCss: resolveAsset(dirs, 'qunit/qunit/qunit.css', CDN.qunitCss)
  };
}

module.exports = {
  CDN,
  resolveRunnerFrameworkAssets
};
