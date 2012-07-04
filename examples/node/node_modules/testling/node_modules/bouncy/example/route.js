var bouncy = require('bouncy');

bouncy(function (req, bounce) {
    if (req.headers.host === 'beep.example.com') {
        bounce(8001);
    }
    else if (req.headers.host === 'boop.example.com') {
        bounce(8002);
    }
}).listen(8000);
