#!/usr/bin/env node

var log = require('winston')
  , program = require('commander')
  , config = program
  
program
    .version('0.0.3')
    .usage('[options]')
    .option('-f [file]', 'Config file')
    .option('-p, --port [num]', 'Server port - Defaults to 3580', 3580)
    .option('-a, --no-autotest', 'Disable autotest')
    .option('-d, --debug', 'Output debug to debug log')
    .option('--debuglog [log]', 'Name of debug log file. Defaults to testem.log', 'testem.log')
    .option('--no-phantomjs', 'Disable PhantomJS')

program
    .command('ci')
    .description('Continuous integration mode')
    .option('-w, --wait [num]', 'Wait for [num] of browsers before auto-starting tests for CI', 1)
    .option('-t, --no-tap', 'Disable TAP(Test Anything Protocal) output')
    .option('-o, --output [dir]', 'Output directory for TAP files', '')
    .option('-p, --port [num]', 'Server port - Defaults to 3580', 3580)
    .action(function(env){
        env.__proto__ = program
        config = env
        config.ci = true
    })

program.parse(process.argv)

App = config.ci ? 
    require('./lib/ci_mode_app') :
    require('./lib/dev_mode_app')

log.remove(log.transports.Console)
if (config.debug){
    log.add(log.transports.File, {filename: config.debuglog})
}

new App(config)
