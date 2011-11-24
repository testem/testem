var charm = require('charm')(process);
charm.reset();

charm.foreground('red')
    .background('cyan')
    .write('blah blah')
    .display('reset')
    .background('green')
    .write('hello world')
    .display('reset')
    .write('back again')
    
charm.destroy()