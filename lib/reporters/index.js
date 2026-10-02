import tap_reporterMod from "./tap_reporter.js";
import xunit_reporterMod from "./xunit_reporter.js";
import dot_reporterMod from "./dot_reporter.js";
import teamcity_reporterMod from "./teamcity_reporter.js";
import devMod from "./dev/index.js";

const reporters = {
  tap: tap_reporterMod,
  xunit: xunit_reporterMod,
  dot: dot_reporterMod,
  teamcity: teamcity_reporterMod,
  dev: devMod
};

export default reporters;
export { tap_reporterMod as tap };
export { xunit_reporterMod as xunit };
export { dot_reporterMod as dot };
export { teamcity_reporterMod as teamcity };
export { devMod as dev };