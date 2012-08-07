require(__dirname + '/../lib/patchcharm')
var charm = require('charm')(process),
    tty = require('tty');

charm.reset();

charm.erase('screen');

charm.enableScroll(0, 6);

charm.write("about it ain't there, and we got to go someplace " +
    "else and get it, I'm gonna shoot you in the head " +
    "then and there. Then I'm gonna shoot that bitch in " +
    "the kneecaps, find out where my goddamn money is. She " +
    "gonna tell me too. Hey, look at me when I'm talking to you, " +
    "motherfucker. You listen: we go in there, and that nigga " +
    "Winston or anybody else is in there, you the first motherfucker " +
    " to get shot. You understand?");

charm.on('data', function(buf){
    if (buf[2] === 66){ // down arrow
        charm.scrollDown();
    }else if (buf[2] === 65){ // up arrow
        charm.scrollUp();
    }
});

function exit(){
    charm.display('reset');
    charm.erase('screen');
    tty.setRawMode(false);
    charm.destroy();
    process.exit();    
}

charm.on('^C', exit);