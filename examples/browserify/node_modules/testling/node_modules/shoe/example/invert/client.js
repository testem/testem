var shoe = require('../../');
var domready = require('domready');
var es = require('event-stream');

domready(function () {
    var result = document.getElementById('result');
    
    var stream = shoe('/invert');
    var s = es.mapSync(function (msg) {
        result.appendChild(document.createTextNode(msg));
        return String(Number(msg)^1);
    });
    s.pipe(stream).pipe(s);
});
