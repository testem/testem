var schoolbus = require('../../');
var domready = require('domready');

domready(function () {
    var log = (function () {
        var elem = document.getElementById('console');
        return function (msg) {
            var div = document.createElement('div');
            var txt = document.createTextNode(msg);
            div.appendChild(txt);
            elem.appendChild(div);
        };
    })();
    
    var uri = 'http://' + window.location.host + '/test-form/';
    var bus = schoolbus(uri, function (win, $) {
        log('href[0]=' + win.location.href);
        
        var form = $('#form')[0];
        $('input[name=login]').val('testling');
        $('input[name=passw]').val('qwerty');
        $('#form').submit();
    }, { log : log });
    
    bus.next(function (win, $) {
        log('href[1]=' + win.location.href);
        log($('#welcome p:first').text());
    });
    
    bus.appendTo(document.body);
});
