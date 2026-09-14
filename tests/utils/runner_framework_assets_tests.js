const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const log = require('../../lib/log');
const sinon = require('sinon');
const {
  resolveRunnerFrameworkAssets
} = require('../../lib/utils/runner_framework_assets');

describe('resolveRunnerFrameworkAssets', function() {
  let tmpDir;
  let warnStub;

  beforeEach(function() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-runner-assets-'));
    warnStub = sinon.stub(log, 'warn');
  });

  afterEach(function() {
    warnStub.restore();
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

  it('returns /node_modules mocha URLs when mocha is missing', function() {
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'mocha');
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.mochaCss).to.equal('/node_modules/mocha/mocha.css');
    expect(warnStub).to.have.been.calledOnce();
    expect(warnStub.firstCall.args[0]).to.include('mocha');
    expect(warnStub.firstCall.args[0]).not.to.include('qunit');
  });

  it('uses /node_modules mocha paths when mocha is installed in cwd', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'mocha');
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.mochaCss).to.equal('/node_modules/mocha/mocha.css');
    expect(warnStub).not.to.have.been.called();
  });

  it('does not warn about qunit or jasmine when resolving mocha', function() {
    resolveRunnerFrameworkAssets(tmpDir, {}, 'mocha');
    expect(warnStub).to.have.been.calledOnce();
    expect(warnStub.firstCall.args[0]).to.include('mocha');
    expect(warnStub.firstCall.args[0]).not.to.include('qunit');
    expect(warnStub.firstCall.args[0]).not.to.include('jasmine-core');
  });

  it('uses Chai 5+ ESM when mocha+chai is selected and chai package.json type is module', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    writeCwdFile('chai/index.js');
    writeCwdFile('chai/package.json', JSON.stringify({ type: 'module' }));
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'mocha+chai');
    expect(assets.chaiLocal).to.equal(true);
    expect(assets.chaiJs).to.equal('/node_modules/chai/index.js');
    expect(warnStub).not.to.have.been.called();
  });

  it('uses Chai 4 UMD chai.js as a classic script when present', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    writeCwdFile('chai/chai.js');
    writeCwdFile('chai/index.js');
    writeCwdFile('chai/package.json', JSON.stringify({ main: './index.js' }));
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'mocha+chai');
    expect(assets.chaiLocal).to.equal(false);
    expect(assets.chaiJs).to.equal('/node_modules/chai/chai.js');
    expect(warnStub).not.to.have.been.called();
  });

  it('warns about missing chai independently for mocha+chai', function() {
    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'mocha+chai');
    expect(assets.chaiJs).to.equal('/node_modules/chai/chai.js');
    expect(warnStub).to.have.been.calledOnce();
    expect(warnStub.firstCall.args[0]).to.include('chai');
  });

  it('uses jasmine-core 5 paths when boot0.js is present', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot0.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot1.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'jasmine2');
    expect(assets.jasmineCoreV5).to.equal(true);
    expect(assets.jasmineJs).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js'
    );
    expect(assets.jasmineBoot).to.equal(null);
    expect(warnStub).not.to.have.been.called();
  });

  it('uses jasmine-core 3/4 boot.js when boot0.js is absent', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'jasmine2');
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
    expect(warnStub).not.to.have.been.called();
  });

  it('returns /node_modules jasmine URLs when boot files are missing', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'jasmine2');
    expect(assets.jasmineCoreV5).to.equal(false);
    expect(assets.jasmineJs).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js'
    );
    expect(assets.jasmineBoot).to.equal(
      '/node_modules/jasmine-core/lib/jasmine-core/boot.js'
    );
    expect(warnStub).to.have.been.calledOnce();
    expect(warnStub.firstCall.args[0]).to.include('jasmine-core');
  });

  it('uses /node_modules qunit paths when qunit is installed in cwd', function() {
    writeCwdFile('qunit/qunit/qunit.js');
    writeCwdFile('qunit/qunit/qunit.css');
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'qunit');
    expect(assets.qunitJs).to.equal('/node_modules/qunit/qunit/qunit.js');
    expect(assets.qunitCss).to.equal('/node_modules/qunit/qunit/qunit.css');
    expect(warnStub).not.to.have.been.called();
  });

  it('returns /node_modules qunit URLs when qunit is missing', function() {
    const assets = resolveRunnerFrameworkAssets(tmpDir, {}, 'qunit');
    expect(assets.qunitJs).to.equal('/node_modules/qunit/qunit/qunit.js');
    expect(assets.qunitCss).to.equal('/node_modules/qunit/qunit/qunit.css');
    expect(warnStub).to.have.been.calledOnce();
    expect(warnStub.firstCall.args[0]).to.include('qunit');
    expect(warnStub.firstCall.args[0]).not.to.include('mocha');
  });

  it('uses routed ../node_modules when cwd has no install', function() {
    const parentNm = path.join(tmpDir, 'node_modules');
    const appDir = path.join(tmpDir, 'app');
    fs.mkdirSync(appDir);
    writeFile(tmpDir, 'mocha/mocha.js');
    writeFile(tmpDir, 'mocha/mocha.css');
    const assets = resolveRunnerFrameworkAssets(appDir, {
      '/node_modules': '../node_modules'
    }, 'mocha');
    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.mochaCss).to.equal('/node_modules/mocha/mocha.css');
    expect(fs.existsSync(path.join(parentNm, 'mocha/mocha.js'))).to.equal(true);
    expect(warnStub).not.to.have.been.called();
  });

  it('resolves all runner assets through a trailing-slash array route', function() {
    const appDir = path.join(tmpDir, 'app');
    fs.mkdirSync(appDir);

    writeFile(tmpDir, 'mocha/mocha.js');
    writeFile(tmpDir, 'mocha/mocha.css');
    writeFile(tmpDir, 'chai/index.js');
    writeFile(tmpDir, 'chai/package.json', JSON.stringify({ type: 'module' }));
    writeFile(tmpDir, 'jasmine-core/lib/jasmine-core/jasmine.js');
    writeFile(tmpDir, 'jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeFile(tmpDir, 'jasmine-core/lib/jasmine-core/boot0.js');
    writeFile(tmpDir, 'jasmine-core/lib/jasmine-core/boot1.js');
    writeFile(tmpDir, 'jasmine-core/lib/jasmine-core/jasmine.css');
    writeFile(tmpDir, 'qunit/qunit/qunit.js');
    writeFile(tmpDir, 'qunit/qunit/qunit.css');

    const assets = resolveRunnerFrameworkAssets(appDir, {
      '/node_modules/': ['missing-node-modules', '../node_modules']
    }, 'mocha+chai');

    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.chaiLocal).to.equal(true);
    expect(assets.chaiJs).to.equal('/node_modules/chai/index.js');

    Object.values(assets)
      .filter(value => typeof value === 'string' && value.startsWith('/node_modules/'))
      .forEach(value => expect(value).not.to.include('\\'));
  });

  it('prefers a cwd Chai UMD layout over routed Chai ESM', function() {
    const otherRoot = path.join(tmpDir, 'other');
    const otherNodeModules = path.join(otherRoot, 'node_modules');

    writeCwdFile('mocha/mocha.js');
    writeCwdFile('mocha/mocha.css');
    writeCwdFile('chai/chai.js');
    writeFile(otherRoot, 'chai/index.js');
    writeFile(
      otherRoot,
      'chai/package.json',
      JSON.stringify({ type: 'module' })
    );

    const assets = resolveRunnerFrameworkAssets(tmpDir, {
      '/node_modules': otherNodeModules
    }, 'mocha+chai');

    expect(assets.mochaJs).to.equal('/node_modules/mocha/mocha.js');
    expect(assets.chaiLocal).to.equal(false);
    expect(assets.chaiJs).to.equal('/node_modules/chai/chai.js');
  });

  it('treats framework jasmine as jasmine2', function() {
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine-html.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot0.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/boot1.js');
    writeCwdFile('jasmine-core/lib/jasmine-core/jasmine.css');
    const aliasAssets = resolveRunnerFrameworkAssets(tmpDir, {}, 'jasmine');
    const directAssets = resolveRunnerFrameworkAssets(tmpDir, {}, 'jasmine2');
    expect(aliasAssets).to.deep.equal(directAssets);
  });
});
