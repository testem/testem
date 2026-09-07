const log = require('../log');

const MUSTACHE_TEST_PAGE_WARNING =
  'Testem: naming test_page with a .mustache extension is deprecated and will be removed in Testem 4. Use a static HTML page and include <script src="/testem.js"></script>.';

let warned = false;

function warnMustacheTestPage() {
  if (warned) {
    return;
  }
  warned = true;
  log.warn(MUSTACHE_TEST_PAGE_WARNING);
  process.emitWarning(MUSTACHE_TEST_PAGE_WARNING, {
    code: 'TESTEM_MUSTACHE_TEST_PAGE_DEPRECATED'
  });
}

function resetMustacheTestPageWarning() {
  warned = false;
}

module.exports = {
  MUSTACHE_TEST_PAGE_WARNING,
  warnMustacheTestPage,
  resetMustacheTestPageWarning
};
