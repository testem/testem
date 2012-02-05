var program = require('commander')

program
    .version('0.0.3')
    .usage('[options]')
    .option('-f [file]', 'Config file')
    .option('-p, --port [num]', 'Server port - Defaults to 3580', 3580)
    .option('-a, --no-autotest', 'Disable autotest')
    .option('-d, --debug', 'Output debug to debug log')
    .option('--debuglog', 'Name of debug log file. Defaults to testem.log')
    .option('--no-phantomjs', 'Disable PhantomJS')
    
    
program
    .command('ci')
    .description('Continuous integration mode')
    .option('-w, --wait [num]', 'Wait for [num] of browsers before auto-starting tests for CI')
    .option('-t, --tap', 'Output TAP(Test Anything Protocal) files')
    .option('-o, --output [dir]', 'Output directory for TAP files', '')
    .action(function(env){
        console.log('tap: ' + env.tap)
        console.log('running in CI mode.')
    })
    
program.parse(process.argv)

console.log('autotest: ' + program.autotest)
console.log('tap: ' + program.tap)