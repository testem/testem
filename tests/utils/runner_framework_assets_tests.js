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

  function writeFile(relPath) {
    const full = path.join(tmpDir, 'node_modules', relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, '');
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
    writeFile('mocha/mocha.js');
    writeFile('mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.mochaCss).to.equal('/node_modules/mocha/mocha.css');
    expect(assets.chaiLocal).to.equal(false);
  });

  it('uses local chai only when both mocha and chai are present', function() {
    writeFile('mocha/mocha.js');
    writeFile('mocha/mocha.css');
    writeFile('chai/index.js');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.chaiLocal).to.equal(true);
    expect(assets.chaiJs).to.equal('/node_modules/chai/index.js');
  });

  it('uses jasmine-core 5 paths when boot0.js is present', function() {
    writeFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeFile('jasmine-core/lib/jasmine-core/boot0.js');
    writeFile('jasmine-core/lib/jasmine-core/boot1.js');
    writeFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.jasmineCoreV5).to.equal(true);
    expect(assets.jasmineJs).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js'
    );
    expect(assets.jasmineBoot).to.equal(null);
  });

  it('uses /node_modules qunit paths when qunit is installed in cwd', function() {
    writeFile('qunit/qunit/qunit.js');
    writeFile('qunit/qunit/qunit.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir);
    expect(assets.qunitJs).to.equal('/node_modules/qunit/qunit/qunit.js');
    expect(assets.qunitCss).to.equal('/node_modules/qunit/qunit/qunit.css');
  });
});
