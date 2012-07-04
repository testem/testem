var spawn = require('child_process').spawn;
var merge = require('merge');

var browsers = {
    'google-chrome' : {
        name : 'chrome',
        re : /Google Chrome (\S+)/,
        type : 'chrome',
        profile : true,
    },
    'chromium-browser' : {
        name : 'chromium',
        re : /Chromium (\S+)/,
        type : 'chrome',
        profile : true,
    },
    'firefox' : {
        name : 'firefox',
        re : /Mozilla Firefox (\S+)/,
        type : 'firefox',
        profile : true,
    },
    'phantomjs' : {
        name : 'phantom',
        re : /(\S+)/,
        type : 'phantom',
        headless : true,
        profile : true,
    },
};

module.exports = function (cb) {
    var available = [];
    var pending = Object.keys(browsers).length;
    
    Object.keys(browsers).forEach(function (name) {
        var br = browsers[name];
        check(name, function (v) {
            if (v) {
                available.push(merge(br, {
                    command : name,
                    version : v,
                }));
            }
            if (--pending === 0) cb(available);
        });
    });
};

function check (name, cb) {
    var re = browsers[name].re;
    
    var ps = spawn(name, [ '--version' ]);
    var data = '';
    ps.stdout.on('data', function (buf) { data += buf });
    
    ps.on('exit', function (code, sig) {
        if (code !== 0) return cb(null);
        
        var m = re.exec(data);
        if (m) cb(m[1])
        else cb(data.trim())
    });
};
