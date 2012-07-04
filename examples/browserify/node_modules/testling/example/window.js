var test = require('../');

test('title test', function (t) {
    var w = t.createWindow('http://substack.net/', { t : t });
    w.next(function (win, $) {
        t.equal(win.location.href, 'http://substack.net/');
        t.equal(win.document.title, 'The Universe of Discord');
        t.end();
    });
});
