#!/usr/bin/env node

var log = require('winston')
  , program = require('commander')
  , progOptions = program
  , Config = require('./lib/config')
  , command
  
program
    .version(require(__dirname + '/package').version)
    .usage('[options]')
    .option('-f, --file [file]', 'config file - defaults to testem.json or testem.yml')
    .option('-p, --port [num]', 'server port - defaults to 7357', Number)
    .option('-l, --launchers [list]', 'list of browsers to auto-launch(comma separated)')
    .option('-d, --debug', 'output debug to debug log - testem.log')

program
    .command('launchers')
    .description('Print the list of available launchers (browsers & process launchers)')
    .action(function(env){
        progOptions = env
        command = 'launchers'
    })

program
    .command('ci')
    .description('Continuous integration mode')
    .option('-l, --launchers [list]', 'list of browsers to test(comma separated)')
    .option('-s, --skip [list]', 'list of browsers to skip(comma separated)')
    .option('-t, --timeout [sec]', 'timeout a browser after [sec] seconds', null)
    .action(function(env){
        env.__proto__ = program
        progOptions = env
        command = 'ci'
    })

program.parse(process.argv)
log.remove(log.transports.Console)
if (progOptions.debug){
    log.add(log.transports.File, {filename: 'testem.log'})
}

var config = new Config(progOptions)
if (command === 'launchers'){
    config.read(function(){
        config.printLauncherInfo()
    })
}else{
    App = command === 'ci' ? 
        require('./lib/ci_mode_app') :
        require('./lib/dev_mode_app')
    new App(config)
}