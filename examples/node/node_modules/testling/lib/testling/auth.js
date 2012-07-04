var request = require('request');
var promzard = require('promzard');

var fs = require('fs');
var path = require('path');
var exists = fs.exists || path.exists;

var home = process.env.HOME || process.env.USERDIR;
var configfile = path.join(home, '.config', 'testling.json');
var infile = __dirname + '/config/auth.js';

module.exports = function (cb) {
    exists(configfile, function (ex) {
        if (ex) {
            fs.readFile(configfile, function (err, src) {
                if (err) cb(err)
                else cb(null, unscrub(JSON.parse(src)))
            })
        }
        else promzard(infile, {}, function (err, data) {
            if (err) return cb(err);
            var src = JSON.stringify(data);
            fs.writeFile(configfile, src, function (err) {
                if (err) cb(err)
                else cb(null, unscrub(data))
            });
        })
    });
};

function unscrub (obj) {
    var auth = Object.keys(obj).reduce(function (acc, key) {
        if (key === 'password') {
            acc[key] = Buffer(obj[key], 'base64').toString()
        }
        else acc[key] = obj[key]
        return acc;
    }, {});
    auth.prefix = [ auth.email, auth.password ]
        .map(encodeURIComponent).join(':')
    ;
    return auth;
}
