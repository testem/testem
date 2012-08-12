#!/usr/bin/env node

var program = require('commander')
var command
var env
program
    .usage('[options]')
    .option('-f, --file [file]', 'config file - defaults to testem.json or testem.yml')
    .option('-p, --port [num]', 'server port - defaults to 7357', Number)
    .option('-l, --launch [list]', 'list of launchers to launch(comma separated)')
    .option('-s, --skip [list]', 'list of launchers to skip(comma separated)')
    .option('-d, --debug', 'output debug to debug log - testem.log')

program
    .command('launchers')
    .description('Print the list of available launchers (browsers & process launchers)')
    .action(function(e){
        env = e
        console.log(env)
        
    })

program
    .command('ci')
    .description('Continuous integration mode')
    .option('-t, --timeout [sec]', 'timeout a browser after [sec] seconds', null)
    .action(function(e){
        env = e
        console.log(env.skip)
        command = 'ci'
    })


program.parse(process.argv)

console.log(program)

