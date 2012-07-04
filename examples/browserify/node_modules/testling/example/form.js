var test = require('../');

test('submit a form', function (t) {
    t.plan(1);
    
    var uri = 'http://localhost:7272/test-form/';
    var w = t.createWindow(uri, { t : t });
    
    w.next(function (win, $) {
        t.log('page[0]: ' + win.location.href);
        
        var form = $('#form')[0];
        $('input[name=login]').val('beep');
        $('input[name=passw]').val('boop');
        $('form').submit();
    });
    
    w.next(function (win, $) {
        t.log('page[1]: ' + win.location.href);
        t.equal($('#welcome p:first').text(), 'Login successful.');
        t.end();
    });
});
