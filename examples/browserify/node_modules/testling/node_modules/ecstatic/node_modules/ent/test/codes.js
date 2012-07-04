var assert = require('assert');
var ent = require('ent');

exports.amp = function () {
    var a = 'a & b & c';
    var b = 'a &amp; b &amp; c';
    assert.eql(ent.encode(a), b);
    assert.eql(ent.decode(b), a);
};

exports.html = function () {
    var a = '<html> © π " \'';
    var b = '&lt;html&gt; &copy; &pi; &quot; &apos;';
    assert.eql(ent.encode(a), b);
    assert.eql(ent.decode(b), a);
};

exports.num = function () {
    var a = String.fromCharCode(1337);
    var b = '&#1337;';
    assert.eql(ent.encode(a), b);
    assert.eql(ent.decode(b), a);
    
    assert.eql(ent.encode(a + a), b + b);
    assert.eql(ent.decode(b + b), a + a);
};

exports.hex = function () {
    for (var i = 0; i < 32; i++) {
        var a = String.fromCharCode(i);
        if (a.match(/\s/)) {
            assert.equal(ent.decode(a), a);
        }
        else {
            var b = '&#x' + i.toString(16) + ';';
            assert.equal(ent.decode(b), a);
            assert.equal(ent.encode(a), '&#' + i + ';');
        }
    }
    
    for (var i = 127; i < 2000; i++) {
        var a = String.fromCharCode(i);
        var b = '&#x' + i.toString(16) + ';';
        var c = '&#X' + i.toString(16) + ';';
        
        assert.equal(ent.decode(b), a);
        assert.equal(ent.decode(c), a);
        
        var encoded = ent.encode(a);
        var encoded2 = ent.encode(a + a);
        if (!encoded.match(/^&\w+;/)) {
            assert.equal(encoded, '&#' + i + ';');
            assert.equal(encoded2, '&#' + i + ';&#' + i + ';');
        }
    }
};
