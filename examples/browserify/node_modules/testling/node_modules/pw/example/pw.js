var pw = require('../');

process.stdout.write('Password: ');
pw(function (password) {
    console.log('password=' + password);
})
