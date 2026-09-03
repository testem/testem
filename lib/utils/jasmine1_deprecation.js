const log = require('../log');

const JASMINE1_FRAMEWORK_WARNING =
  'Testem: framework "jasmine" (Jasmine 1.x) is deprecated and will be removed in the next version of Testem. Use "framework": "jasmine2" with the jasmine-core package, or load Jasmine 2+ on a custom test_page.';

function warnJasmine1Framework() {
  log.warn(JASMINE1_FRAMEWORK_WARNING);
  process.emitWarning(JASMINE1_FRAMEWORK_WARNING, {
    code: 'TESTEM_JASMINE1_DEPRECATED'
  });
}

module.exports = {
  JASMINE1_FRAMEWORK_WARNING,
  warnJasmine1Framework
};
