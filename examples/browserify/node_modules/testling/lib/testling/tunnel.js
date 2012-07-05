var withAuth = require('./auth');
var fs = require('fs');
var path = require('path');
var request = require('request');
var spawn = require('child_process').spawn;

var configDir = path.join(
    process.env.HOME || process.env.USERPROFILE,
    '.config'
);
var mkdirp = require('mkdirp');
mkdirp.sync(configDir);
var file = path.join(configDir, 'testling_tunnel.json');

exports = module.exports = function (addr) {
    if (exports.running) {
        console.error('# tunnel appears to be already running, trying anyhow');
    }
    
    withAuth(function (err, auth) {
        if (err) return console.error(err);
        var u = 'http://' + auth.prefix + '@testling.com/tunnel';
        request(u, function checkBody (err, res, body) {
            if (err) return console.error(err);
            
            var m = /ssh -NR (\d+):\S+ (\S+)/.exec(body);
            if (m) {
                var args = [ '-NR', m[1] + ':' + addr, m[2] ];
                console.log('# ssh ' + args.join(' '));
                var ps = spawn('ssh', args, { customFds : [ 0, 1, 2 ] });
                var cfg = {
                    pid : ps.pid,
                    port : m[1],
                    addr : 'http://tunnel.browserling.com:' + m[1],
                };
                var s = JSON.stringify(cfg);
                
                fs.writeFile(file, s, function (err) {
                    if (err) return console.error(err);
                });
            }
            else if (/open a tunnel with:/i.test(body)) {
                request(u + '/open', checkBody)
            }
            else console.error('unexpected response from server: ' + body)
        });
    });
};

if ((fs.existsSync || path.existsSync)(file)) {
    var json = JSON.parse(fs.readFileSync(file));
    exports.config = json;
    try {
        process.kill(json.pid, 0);
        exports.running = true; // didn't get ESRCH
    }
    catch (err) {}
}
