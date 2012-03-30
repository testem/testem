var assert = require('assert');
var bunker = require('../');
var fs = require('fs');

var src = fs.readdirSync(__dirname + '/src').reduce(function (acc, file) {
    acc[file] = fs.readFileSync(__dirname + '/src/' + file, 'utf8');
    return acc;
}, {});

exports.cover = function () {
    var b = bunker(src['cover.js']);
    var counts = {};
    
    b.on('node', function (node) {
        counts[node.name] = (counts[node.name] || 0) + 1;
    });
    
    b.run({
        setInterval : setInterval,
        clearInterval : function () {
            process.nextTick(function () {
                assert.deepEqual(counts, {
                    binary : 11,
                    'unary-postfix' : 11,
                    'var' : 2,
                    call : 2, // setInterval and clearInterval
                    stat : 1, // clearInterval
                });
            });
            
            return clearInterval.apply(this, arguments);
        },
        console : console
    });
};
