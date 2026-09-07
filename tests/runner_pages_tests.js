const expect = require('chai').expect;
const {
  escapeHtml,
  scriptTags,
  styleTags,
  loadScriptCalls
} = require('../lib/runner_pages/html');
const {
  renderRunner,
  renderDirectoryListing
} = require('../lib/runner_pages');
const renderJasmine1 = require('../lib/runner_pages/jasmine');

describe('runner_pages html helpers', function() {
  describe('escapeHtml', function() {
    it('escapes &, <, >, and "', function() {
      expect(escapeHtml('a&b<c>"d')).to.equal('a&amp;b&lt;c&gt;&quot;d');
    });
  });

  describe('scriptTags', function() {
    it('returns an empty string for a missing list', function() {
      expect(scriptTags()).to.equal('');
      expect(scriptTags([])).to.equal('');
    });

    it('renders src and raw attrs', function() {
      expect(scriptTags([
        { src: 'spec.js', attrs: ['data-foo="true"', 'data-bar'] }
      ])).to.equal('<script src="spec.js" data-foo="true" data-bar></script>');
    });
  });

  describe('styleTags', function() {
    it('escapes hrefs', function() {
      expect(styleTags(['a&b.css'])).to.equal(
        '<link rel="stylesheet" href="a&amp;b.css">',
      );
    });

    it('treats a string as one href', function() {
      expect(styleTags('custom.css')).to.equal(
        '<link rel="stylesheet" href="custom.css">',
      );
    });

    it('returns an empty string for a missing or empty value', function() {
      expect(styleTags()).to.equal('');
      expect(styleTags('')).to.equal('');
      expect(styleTags([])).to.equal('');
    });
  });

  describe('loadScriptCalls', function() {
    it('matches the mocha+chai ESM await loadScript lines', function() {
      expect(loadScriptCalls([
        { src: 'tests/web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar'] }
      ])).to.equal(
        "await loadScript('tests/web/hello_tst.js', 'data-foo=\"true\"', 'data-bar');",
      );
      expect(loadScriptCalls([
        { src: 'tests/web/hello.js', attrs: ['data-footer'] }
      ])).to.equal(
        "await loadScript('tests/web/hello.js', 'data-footer');",
      );
    });
  });
});

describe('renderDirectoryListing', function() {
  it('escapes file names in href and text', function() {
    const html = renderDirectoryListing({ files: ['a&b.txt', 'ok.txt'] });
    expect(html).to.include('<a href="a&amp;b.txt">a&amp;b.txt</a>');
    expect(html).to.include('<a href="ok.txt">ok.txt</a>');
    expect(html).to.not.include('href="a&b.txt"');
  });
});

describe('renderRunner', function() {
  it('keeps Jasmine 1 CDN pins on the unused jasmine module', function() {
    const html = renderJasmine1({});
    expect(html).to.include(
      '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine.js',
    );
    expect(html).to.include(
      '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine-html.js',
    );
    expect(html).to.include(
      '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine.css',
    );
    expect(html).to.include('jasmine.HtmlReporter');
  });

  it('aliases framework jasmine to the jasmine2 runner', function() {
    const data = {
      jasmineJs: '/node_modules/jasmine-core/lib/jasmine-core/jasmine.js',
      jasmineHtml: '/node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js',
      jasmineCss: '/node_modules/jasmine-core/lib/jasmine-core/jasmine.css',
      jasmineBoot: '/node_modules/jasmine-core/lib/jasmine-core/boot.js',
      jasmineCoreV5: false
    };
    const html = renderRunner('jasmine', data);
    expect(html).to.equal(renderRunner('jasmine2', data));
    expect(html).to.include(
      '/node_modules/jasmine-core/lib/jasmine-core/jasmine-html.js',
    );
    expect(html).to.not.include(
      '//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/',
    );
  });

  it('returns null for an unknown framework', function() {
    expect(renderRunner('nope', {})).to.equal(null);
  });

  it('renders mocha+chai ESM loadScript calls', function() {
    const html = renderRunner('mocha+chai', {
      chaiLocal: true,
      mochaCss: '/node_modules/mocha/mocha.css',
      mochaJs: '/node_modules/mocha/mocha.js',
      chaiJs: '/node_modules/chai/index.js',
      scripts: [
        { src: 'tests/web/hello_tst.js', attrs: ['data-foo="true"', 'data-bar'] }
      ],
      footer_scripts: [
        { src: 'tests/web/hello.js', attrs: ['data-footer'] }
      ]
    });
    expect(html).to.include("import * as chai from '/node_modules/chai/index.js'");
    expect(html).to.include('function loadScript(src)');
    expect(html).to.include(
      "await loadScript('tests/web/hello_tst.js', 'data-foo=\"true\"', 'data-bar');",
    );
    expect(html).to.include(
      "await loadScript('tests/web/hello.js', 'data-footer');",
    );
    expect(html).to.include('globalThis.mocha.run()');
  });
});
