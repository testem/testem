import renderJasmine2 from "./jasmine2.js";
import qunitMod from "./qunit.js";
import mochaMod from "./mocha.js";
import mocha_chaiMod from "./mocha_chai.js";
import customMod from "./custom.js";
import tapMod from "./tap.js";
import directoryMod from "./directory.js";

const pages = {
  jasmine: renderJasmine2,
  jasmine2: renderJasmine2,
  qunit: qunitMod,
  mocha: mochaMod,
  'mocha+chai': mocha_chaiMod,
  custom: customMod,
  tap: tapMod
};

function renderRunner(framework, data) {
  const render = pages[framework];
  return render ? render(data) : null;
}

export { renderRunner };
export { directoryMod as renderDirectoryListing };