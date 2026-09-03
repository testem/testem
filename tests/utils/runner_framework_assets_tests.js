const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const {
  CDN,
  resolveRunnerFrameworkAssets
} = require('../../lib/utils/runner_framework_assets');

describe('resolveRunnerFrameworkAssets', function() {
  let tmpDir;

  beforeEach(function() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-runner-assets-'));
  });

  afterEach(function() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(baseDir, relPath, contents) {
    const full = path.join(baseDir, 'node_modules', relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents === undefined ? '' : contents);
  }

  function writeCwdFile(relPath, contents) {
    writeFile(tmpDir, relPath, contents);
  }

  it('falls back to current CDN pins when cwd has no node_modules frameworks', function() {
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.mochaJs).to.equal(CDN.mochaJs);
    expect(assets.mochaCss).to.equal(CDN.mochaCss);
    expect(assets.chaiLocal).to.equal(false);
    expect(assets.chaiJs).to.equal(CDN.chaiJs);
    expect(assets.jasmineCoreV5).to.equal(false);
    expect(assets.jasmineJs).to.equal(CDN.jasmineJs);
    expect(assets.jasmineBoot).to.equal(CDN.jasmineBoot);
    expect(assets.qunitJs).to.equal(CDN.qunitJs);
    expect(assets.qunitCss).to.equal(CDN.qunitCss);
  });

  it('uses /node_modules mocha paths when mocha is installed in cwd', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.mochaCss).to.equal('/node_modules/mocha/mocha.css');
    expect(assets.chaiLocal).to.equal(false);
  });

  it('uses Chai 5+ ESM when mocha is local and chai package.json type is module', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    writeCwdFile('chai/index.js');
    writeCwdFile('chai/package.json', JSON.stringify({ type: 'module' }));
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.chaiLocal).to.equal(true);
    expect(assets.chaiJs).to.equal('/node_modules/chai/index.js');
  });

  it('uses Chai 4 UMD chai.js as a classic script when present', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    writeCwdFile('chai/chai.js');
    writeCwdFile('chai/index.js');
    writeCwdFile('chai/package.json', JSON.stringify({ main: './index.js' }));
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.chaiLocal).to.equal(false);
    expect(assets.chaiJs).to.equal('/node_modules/chai/chai.js');
  });

  it('keeps CDN Chai when mocha is local but chai is CJS without chai.js', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    writeCwdFile('chai/index.js');
    writeCwdFile('chai/package.json', JSON.stringify({ main: './index.js' }));
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.chaiLocal).to.equal(false);
    expect(assets.chaiJs).to.equal(CDN.chaiJs);
  });

  it('uses jasmine-core 5 paths when boot0.js is present', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot0.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot1.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.jasmineCoreV5).to.equal(true);
    expect(assets.jasmineJs).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js'
    );
    expect(assets.jasmineBoot).to.equal(null);
  });

  it('uses jasmine-core 3/4 boot.js when boot0.js is absent', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.jasmineCoreV5).to.equal(false);
    expect(assets.jasmineJs).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js'
    );
    expect(assets.jasmineHtml).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js'
    );
    expect(assets.jasmineCss).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine.css'
    );
    expect(assets.jasmineBoot).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/boot.js'
    );
  });

  it('falls back to CDN Jasmine when jasmine.js exists without a boot file', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.jasmineCoreV5).to.equal(false);
    expect(assets.jasmineJs).to.equal(CDN.jasmineJs);
    expect(assets.jasmineBoot).to.equal(CDN.jasmineBoot);
  });

  it('uses /node_modules qunit paths when qunit is installed in cwd', function() {
    writeCwdFile('qunit/qunit/qunit.js');
    writeCwdFile('qunit/qunit/qunit.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.qunitJs).to.equal('/node_modules/qunit/qunit/qunit.js');
    expect(assets.qunitCss).to.equal('/node_modules/qunit/qunit/qunit.css');
  });

  it('uses routed ../node_modules when cwd has no install', function() {
    const parentNm = path.join(tmpDir, 'node_modules');
    const appDir = path.join(tmpDir, 'app');
    fs.mkdirSync(appDir);
    writeFile(tmpDir, 'mocha/mocha.js');
    writeFile(tmpDir, 'mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(appDir, {
      '/node_modules': '../node_modules'
    });
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.mochaCss).to.equal('/node_modules/mocha/mocha.css');
    expect(fs.existsSync(path.join(parentNm, 'mocha/mocha.js'))).to.equal(true);
  });

  it('prefers cwd node_modules over an empty routed dir', function() {
    const other = path.join(tmpDir, 'other-node-modules');
    fs.mkdirSync(other);
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {
      '/node_modules': other
    });
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
  });
});
