function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }


var charm = require('charm')(process);
charm.reset();

var colors = [ 'red', 'cyan', 'yellow', 'green', 'blue' ];
var text = 'Always after me lucky charms.';

function iv(){
}

charm.write('blah' + red('foo') + 'bar' + 'abc abec abecuot abceotu ' + 
    blue('bauhe ohtueos uehotau hutesoahueo uhetnosa uhueto') +
    'batueo utoes uneoha uheosuhtesnoh utone' +
    '\n' + green('blah'))

charm.on('data', function (buf) {
    if (buf[0] === 3) {
        clearInterval(iv);
        charm.destroy();
    }
});