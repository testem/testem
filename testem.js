#!/usr/bin/env node

var log = require('winston')
  , program = require('commander')
  , progOptions = program
  , ci = false
  
program
    .version(require(__dirname + '/package').version)
    .usage('[options]')
    .option('-f, --file [file]', 'Config file', 'testem.yml')
    .option('-p, --port [num]', 'Server port - Defaults to 7357', 7357)
    .option('-d, --debug', 'Output debug to debug log')
    .option('--debuglog [log]', 'Name of debug log file. Defaults to testem.log', 'testem.log')

program
    .command('ci')
    .description('Continuous integration mode')
    .option('-b, --browsers [list]', 'List of browsers to test(comma separated).')
    .option('-s, --skip [list]', 'List of browsers to skip(comma separated).')
    .option('-l, --list', 'Print the list of available browsers.')
    .option('-t, --timeout [sec]', 'Timeout a browser after [sec] seconds.', null)
    .action(function(env){
        env.__proto__ = program
        progOptions = env
        ci = true
    })

program.parse(process.argv)
App = ci ? 
    require('./lib/ci_mode_app') :
    require('./lib/dev_mode_app')

log.remove(log.transports.Console)
if (progOptions.debug){
    log.add(log.transports.File, {filename: progOptions.debuglog})
}

new App(progOptions)
