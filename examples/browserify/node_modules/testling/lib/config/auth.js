var pw = require('pw');

module.exports = {
    "email" : prompt('testling email'),
    "password" : function (cb) {
        process.stdout.write('testling password: ');
        pw(function (s) {
            cb(null, Buffer(s).toString('base64'));
        });
    }
};
