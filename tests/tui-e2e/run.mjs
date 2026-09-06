import { name as startupName, run as startup } from './startup.mjs';
import { name as pauseName, run as pause } from './pause.mjs';
import { name as tabsName, run as tabs } from './tabs.mjs';
import { name as pagingName, run as paging } from './paging.mjs';
import { name as rerunName, run as rerun } from './rerun.mjs';
import { name as unboundName, run as unbound } from './unbound.mjs';
import { name as quitLowerName, run as quitLower } from './quit_lower.mjs';
import { name as quitUpperName, run as quitUpper } from './quit_upper.mjs';
import { name as quitCtrlCName, run as quitCtrlC } from './quit_ctrl_c.mjs';

const sessions = [
  { name: startupName, run: startup },
  { name: pauseName, run: pause },
  { name: tabsName, run: tabs },
  { name: pagingName, run: paging },
  { name: rerunName, run: rerun },
  { name: unboundName, run: unbound },
  { name: quitLowerName, run: quitLower },
  { name: quitUpperName, run: quitUpper },
  { name: quitCtrlCName, run: quitCtrlC }
];

async function main() {
  const only = process.env.TESTEM_TUI_E2E;
  const selected = only
    ? sessions.filter((session) => session.name === only)
    : sessions;

  if (selected.length === 0) {
    console.error('Unknown TESTEM_TUI_E2E session: ' + only);
    console.error('Known: ' + sessions.map((session) => session.name).join(', '));
    process.exitCode = 1;
    return;
  }

  for (const session of selected) {
    console.log('tui-e2e ' + session.name);
    await session.run();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
