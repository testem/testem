#!/usr/bin/env node

var log = require('winston')
  , program = require('commander')
  , config = program
  
program
    .version(require(__dirname + '/package').version)
    .usage('[options]')
    .option('-f [file]', 'Config file')
    .option('-p, --port [num]', 'Server port - Defaults to 7357', 7357)
    .option('-d, --debug', 'Output debug to debug log')
    .option('--debuglog [log]', 'Name of debug log file. Defaults to testem.log', 'testem.log')

program
    .command('ci')
    .description('Continuous integration mode')
    .option('-b, --browsers [list]', 'List of browsers to test(comma separated).')
    .option('-s, --skip [list]', 'List of browsers to skip(comma separated).')
    .option('-l, --list', 'Print the list of available browsers.')
    .option('-p, --port [num]', 'Server port - Defaults to 7357', 7357)
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
