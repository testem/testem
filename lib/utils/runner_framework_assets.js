const fs = require('fs');
const path = require('path');
const log = require('../log');

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

function reportMissing(missing, pkg) {
  if (!missing.some(entry => entry.install === pkg.install)) {
    missing.push(pkg);
  }
}

function warnMissingPackages(framework, missing) {
  missing.forEach(pkg => {
    log.warn(
      'Testem: framework "' + framework + '" requires the npm package "' +
      pkg.install + '". Install it in your project (npm install ' + pkg.install +
      ') or map it via "routes": { "/node_modules": "..." } to a directory that ' +
      'contains it. Missing: ' + pkg.paths.join(', ')
    );
  });
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

function resolveMocha(dirs, missing) {
  const paths = ['mocha/mocha.js', 'mocha/mocha.css'];
  if (!existsInNodeModules(dirs, 'mocha/mocha.js')) {
    reportMissing(missing, {
      install: 'mocha',
      paths
    });
  }
  return {
    mochaJs: nodeModulesUrl('mocha/mocha.js'),
    mochaCss: nodeModulesUrl('mocha/mocha.css')
  };
}

function resolveChai(dirs, missing) {
  if (existsInNodeModules(dirs, 'chai/chai.js')) {
    return { chaiLocal: false, chaiJs: nodeModulesUrl('chai/chai.js') };
  }
  if (existsInNodeModules(dirs, 'chai/index.js') && isChaiEsm(dirs)) {
    return { chaiLocal: true, chaiJs: nodeModulesUrl('chai/index.js') };
  }
  reportMissing(missing, {
    install: 'chai',
    paths: ['chai/chai.js or chai/index.js (type: module)']
  });
  return { chaiLocal: false, chaiJs: nodeModulesUrl('chai/chai.js') };
}

function resolveJasmine(dirs, missing) {
  const corePaths = [JASMINE_JS, JASMINE_HTML, JASMINE_CSS];
  const hasCore = corePaths.every(relPath => existsInNodeModules(dirs, relPath));
  const hasBoot0 = existsInNodeModules(dirs, JASMINE_BOOT0);
  const hasBoot1 = existsInNodeModules(dirs, JASMINE_BOOT1);
  const hasLegacyBoot = existsInNodeModules(dirs, JASMINE_BOOT);
  const jasmineCoreV5 = hasCore && hasBoot0 && hasBoot1;
  const jasmineLegacy = hasCore && hasLegacyBoot && !jasmineCoreV5;

  if (!hasCore) {
    reportMissing(missing, {
      install: 'jasmine-core',
      paths: corePaths
    });
  } else if (!jasmineCoreV5 && !jasmineLegacy) {
    reportMissing(missing, {
      install: 'jasmine-core',
      paths: [JASMINE_BOOT0, JASMINE_BOOT1, JASMINE_BOOT]
    });
  }

  return {
    jasmineCoreV5,
    jasmineJs: nodeModulesUrl(JASMINE_JS),
    jasmineHtml: nodeModulesUrl(JASMINE_HTML),
    jasmineCss: nodeModulesUrl(JASMINE_CSS),
    jasmineBoot: jasmineCoreV5 ? null : nodeModulesUrl(JASMINE_BOOT)
  };
}

function resolveQunit(dirs, missing) {
  const paths = ['qunit/qunit/qunit.js', 'qunit/qunit/qunit.css'];
  if (!existsInNodeModules(dirs, 'qunit/qunit/qunit.js')) {
    reportMissing(missing, {
      install: 'qunit',
      paths
    });
  }
  return {
    qunitJs: nodeModulesUrl('qunit/qunit/qunit.js'),
    qunitCss: nodeModulesUrl('qunit/qunit/qunit.css')
  };
}

function resolveRunnerFrameworkAssets(cwd, routes, framework) {
  cwd = cwd || process.cwd();
  const dirs = nodeModulesDirs(cwd, routes);
  const missing = [];
  let assets = {};

  switch (framework) {
    case 'mocha':
      assets = resolveMocha(dirs, missing);
      break;
    case 'qunit':
      assets = resolveQunit(dirs, missing);
      break;
    case 'jasmine':
    case 'jasmine2':
      assets = resolveJasmine(dirs, missing);
      break;
    case 'mocha+chai':
      assets = Object.assign(
        resolveMocha(dirs, missing),
        resolveChai(dirs, missing)
      );
      break;
    default:
      break;
  }

  if (missing.length) {
    warnMissingPackages(framework, missing);
  }

  return assets;
}

module.exports = {
  resolveRunnerFrameworkAssets
};
