#!/usr/bin/env node

const { Command } = require('commander');
const Config = require('./lib/config');
const Api = require('./lib/api');

// this is to workaround the weird behavior in commander where
// if you provide additional command line arguments that aren't
// options, it goes in as a string as the 1st argument of the
// "action" callback, we don't want this
function act(fun) {
  return function() {
    let options = arguments[arguments.length - 1];
    fun(options);
  };
}

/**
 * Build and parse a fresh Commander program from the given argv array.
 * Returns { progOptions, appMode } where progOptions is a plain object
 * containing all resolved option values (from program.opts() /
 * optsWithGlobals()), so option values are directly accessible as
 * properties rather than requiring access via a Command instance.
 * A _commander reference is attached for internal option enumeration.
 *
 * @param {string[]} argv - process.argv-style array
 * @param {{ exitOverride?: boolean }} [opts]
 *   exitOverride: when true, commander throws instead of calling process.exit
 *   (useful in tests to prevent the process from terminating)
 */
function parseArgs(argv, { exitOverride = false } = {}) {
  let progOptions = null;
  let appMode = 'dev';

  const program = new Command();

  if (exitOverride) {
    program.exitOverride();
  }

  program
    .version(require(__dirname + '/package').version)
    .usage('[options]')
    .option(
      '-f, --file [file]',
      'config file - defaults to testem.json or testem.yml',
    )
    .option('-p, --port [num]', 'server port - defaults to 7357', Number)
    .option('--host [hostname]', 'host name - defaults to localhost', String)
    .option(
      '-l, --launch [list]',
      'list of launchers to launch(comma separated)',
    )
    .option('-s, --skip [list]', 'list of launchers to skip(comma separated)')
    .option(
      '-d, --debug [file]',
      'output debug to debug log - defaults to testem.log',
    )
    .option('-t, --test_page [page]', 'the html page to drive the tests')
    .option('-g, --growl', 'turn on growl / native notifications')
    // A root action is required in commander v7+ to prevent the program from
    // automatically displaying help and exiting when no subcommand is given.
    // Without it, running `testem` (dev mode) would show help instead of
    // starting the dev server.
    .action(() => {});

  program
    .command('launchers')
    .description(
      'Print the list of available launchers (browsers & process launchers)',
    )
    .action(
      act((env) => {
        progOptions = env.optsWithGlobals();
        progOptions._commander = env;
        appMode = 'launchers';
      }),
    );

  program
    .command('ci')
    .description('Continuous integration mode')
    .option(
      '-T, --timeout [sec]',
      'timeout a browser after [sec] seconds',
      null,
    )
    .option(
      '-P, --parallel [num]',
      'number of browsers to run in parallel, defaults to 1',
      Number,
    )
    .option('-b, --bail_on_uncaught_error', 'Bail on any uncaught errors')
    .option(
      '-R, --reporter [reporter]',
      'Test reporter to use [tap|dot|xunit|teamcity]',
    )
    .option('--cwd [path]', 'directory to use as root')
    .option(
      '--config_dir [path]',
      'directory to use as root for resolving configs, if different than cwd',
    )
    .action(
      act((env) => {
        progOptions = env.optsWithGlobals();
        progOptions._commander = env;
        appMode = 'ci';
      }),
    );

  program
    .command('server')
    .description('Run just the server')
    .action(
      act((env) => {
        progOptions = env.optsWithGlobals();
        progOptions._commander = env;
        appMode = 'server';
      }),
    );

  program.on('--help', () => {
    console.log('  Keyboard Controls (in dev mode):\n');
    console.log('    ENTER                  run the tests');
    console.log('    q                      quit');
    console.log(
      '    LEFT ARROW             move to the next browser tab on the left',
    );
    console.log(
      '    RIGHT ARROW            move to the next browser tab on the right',
    );
    console.log(
      '    TAB                    switch between top and bottom panel (split mode only)',
    );
    console.log(
      '    UP ARROW               scroll up in the target text panel',
    );
    console.log(
      '    DOWN ARROW             scroll down in the target text panel',
    );
    console.log(
      '    SPACE                  page down in the target text panel',
    );
    console.log('    b                      page up in the target text panel');
    console.log(
      '    d                      half a page down in the target text panel',
    );
    console.log(
      '    u                      half a page up in the target text panel',
    );
    console.log();
  });

  program.parse(argv);

  if (progOptions === null) {
    // dev mode: no subcommand was invoked; use opts() so option values are
    // plain properties rather than requiring access via the Command object
    // (commander v14 no longer exposes options as direct Command properties)
    const devOpts = program.opts();
    devOpts._commander = program;
    progOptions = devOpts;
  }

  return { progOptions, appMode };
}

module.exports = { parseArgs };

if (require.main === module) {
  main();
}

function main() {
  const { progOptions, appMode } = parseArgs(process.argv);

  let config = new Config(appMode, progOptions);
  if (appMode === 'launchers') {
    config.read(() => config.printLauncherInfo());
  } else {
    let api = new Api();
    if (appMode === 'ci') {
      api.startCI(progOptions);
    } else if (appMode === 'dev') {
      api.startDev(progOptions);
    } else if (appMode === 'server') {
      api.startServer(progOptions);
    }
  }
}
