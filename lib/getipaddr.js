// Thanks to <http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js/3742915#3742915>

module.exports = (function () {
    var ignoreRE = /^(127\.0\.0\.1|::1|fe80(:1)?::1(%.*)?)$/i;

    var exec = require('child_process').exec;
    var cached;    
    var command;
    var filterRE;

    switch (process.platform) {
    // TODO: implement for OSs without ifconfig command
    case 'darwin':
         command = 'ifconfig';
         filterRE = /\binet\s+([^\s]+)/g;
         // filterRE = /\binet6\s+([^\s]+)/g; // IPv6
         break;
    case 'win32':
         command = 'ipconfig'
         filterRE = /IPv4 Address[^:]*: ([^\s]+)/g;
        break;
    default:
         command = 'ifconfig';
         filterRE = /\binet\b[^:]+:\s*([^\s]+)/g;
         // filterRE = /\binet6[^:]+:\s*([^\s]+)/g; // IPv6
         break;
    }

    return function (callback, bypassCache) {
         // get cached value
        if (cached && !bypassCache) {
            callback(null, cached);
            return;
        }
        // system call
        exec(command, function (error, stdout, sterr) {
            var ips = [];
            // extract IPs
            var matches = stdout.match(filterRE);
            // JS has no lookbehind REs, so we need a trick
            for (var i = 0; i < matches.length; i++) {
                ips.push(matches[i].replace(filterRE, '$1'));
            }

            // filter BS
            for (var i = 0, l = ips.length; i < l; i++) {
                if (!ignoreRE.test(ips[i])) {
                    //if (!error) {
                        cached = ips[i];
                    //}
                    callback(error, ips[i]);
                    return;
                }
            }
            // nothing found
            callback(error, null);
        });
    };
})();