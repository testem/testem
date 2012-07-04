var connect = require('connect');
var app = connect.createServer();
app.use(connect.static(__dirname))

var io = require('socket.io')

var s = io.listen(app);
s.sockets.on('connection', function (socket) {
    socket.emit('news', { news : 'THERE IS NO NEWS TO REPORT.' });
    socket.on('blues', function (blues) {
        console.log('I gots the blues: ' + blues);
    });
});
app.listen(5001);
