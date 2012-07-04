var fs = require('fs');
var opts = {
    key : fs.readFileSync(__dirname + '/https/privatekey.pem'),
    cert : fs.readFileSync(__dirname + '/https/certificate.pem')
};

var bouncy = require('bouncy');
bouncy(opts, function (req, bounce) {
    bounce(8000);
}).listen(7000);

console.log('https://localhost:7000');
