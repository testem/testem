var buffer = require('../index.js');
var test = require('tap').test;

test('utf8 buffer to base64', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("Ձאab", "utf8").toString("base64"),
        new Buffer("Ձאab", "utf8").toString("base64")
    );
    t.end();
});

test('utf8 buffer to hex', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("Ձאab", "utf8").toString("hex"),
        new Buffer("Ձאab", "utf8").toString("hex")
    );
    t.end();
});

test('utf8 to utf8', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("öäüõÖÄÜÕ", "utf8").toString("utf8"),
        new Buffer("öäüõÖÄÜÕ", "utf8").toString("utf8")
    );
    t.end();
});

test('ascii buffer to base64', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("123456!@#$%^", "ascii").toString("base64"),
        new Buffer("123456!@#$%^", "ascii").toString("base64")
    );
    t.end();
});

test('ascii buffer to hex', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("123456!@#$%^", "ascii").toString("hex"),
        new Buffer("123456!@#$%^", "ascii").toString("hex")
    );
    t.end();
});

test('base64 buffer to utf8', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("1YHXkGFi", "base64").toString("utf8"),
        new Buffer("1YHXkGFi", "base64").toString("utf8")
    );
    t.end();
});

test('hex buffer to utf8', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("d581d7906162", "hex").toString("utf8"),
        new Buffer("d581d7906162", "hex").toString("utf8")
    );
    t.end();
});

test('base64 buffer to ascii', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("MTIzNDU2IUAjJCVe", "base64").toString("ascii"),
        new Buffer("MTIzNDU2IUAjJCVe", "base64").toString("ascii")
    );
    t.end();
});

test('hex buffer to ascii', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("31323334353621402324255e", "hex").toString("ascii"),
        new Buffer("31323334353621402324255e", "hex").toString("ascii")
    );
    t.end();
});
/*
test('utf8 to ascii', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("öäüõÖÄÜÕ", "utf8").toString("ascii"),
        new Buffer("öäüõÖÄÜÕ", "utf8").toString("ascii")
    );
    t.end();
});
*/

test('base64 buffer to binary', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("MTIzNDU2IUAjJCVe", "base64").toString("binary"),
        new Buffer("MTIzNDU2IUAjJCVe", "base64").toString("binary")
    );
    t.end();
});

test('hex buffer to binary', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("31323334353621402324255e", "hex").toString("binary"),
        new Buffer("31323334353621402324255e", "hex").toString("binary")
    );
    t.end();
});

test('utf8 to binary', function (t) {
    t.plan(1);
    t.equal(
        new buffer.Buffer("öäüõÖÄÜÕ", "utf8").toString("binary"),
        new Buffer("öäüõÖÄÜÕ", "utf8").toString("binary")
    );
    t.end();
});

test("hex of write{Uint,Int}{8,16,32}{LE,BE}", function (t) {
    t.plan(2*(2*2*2+2));
    ["UInt","Int"].forEach(function(x){
        [8,16,32].forEach(function(y){
            var endianesses = (y === 8) ? [""] : ["LE","BE"];
            endianesses.forEach(function(z){
                var v1  = new buffer.Buffer(y / 8);
                var v2  = new Buffer(y / 8);
                var writefn  = "write" + x + y + z;
                var val = (x === "Int") ? -3 : 3;
                v1[writefn](val, 0);
                v2[writefn](val, 0);
                t.equal(
                    v1.toString("hex"),
                    v2.toString("hex")
                );
                var readfn = "read" + x + y + z;
                t.equal(
                    v1[readfn](0),
                    v2[readfn](0)
                );
            });
        });
    });
    t.end();
});

test("hex of write{Uint,Int}{8,16,32}{LE,BE} with overflow", function (t) {
    t.plan(3*(2*2*2+2));
    ["UInt","Int"].forEach(function(x){
        [8,16,32].forEach(function(y){
            var endianesses = (y === 8) ? [""] : ["LE","BE"];
            endianesses.forEach(function(z){
                var v1  = new buffer.Buffer(y / 8 - 1);
                var v2  = new Buffer(y / 8 - 1);
                var next = new buffer.Buffer(4);
                next.writeUInt32BE(0, 0);
                var writefn  = "write" + x + y + z;
                var val = (x === "Int") ? -3 : 3;
                v1[writefn](val, 0, true);
                v2[writefn](val, 0, true);
                t.equal(
                    v1.toString("hex"),
                    v2.toString("hex")
                );
                // check that nothing leaked to next buffer.
                t.equal(next.readUInt32BE(0), 0);
                // check that no bytes are read from next buffer.
                next.writeInt32BE(~0, 0);
                var readfn = "read" + x + y + z;
                t.equal(
                    v1[readfn](0, true),
                    v2[readfn](0, true)
                );
            });
        });
    });
    t.end();
});

test("concat() a varying number of buffers", function (t) {
    t.plan(5);
    var zero = [];
    var one  = [ new buffer.Buffer('asdf') ];
    var long = [];
    for (var i = 0; i < 10; i++) long.push(new buffer.Buffer('asdf'));

    var flatZero = buffer.Buffer.concat(zero);
    var flatOne = buffer.Buffer.concat(one);
    var flatLong = buffer.Buffer.concat(long);
    var flatLongLen = buffer.Buffer.concat(long, 40);

    t.equal(flatZero.length, 0);
    t.equal(flatOne.toString(), 'asdf');
    t.equal(flatOne, one[0]);
    t.equal(flatLong.toString(), (new Array(10+1).join('asdf')));
    t.equal(flatLongLen.toString(), (new Array(10+1).join('asdf')));
    t.end();
});

test("buffer from buffer", function (t) {
    t.plan(1);
    var b1 = new buffer.Buffer('asdf');
    var b2 = new buffer.Buffer(b1);
    t.equal(b1.toString('hex'), b2.toString('hex'));
    t.end();
});

test("fill", function(t) {
    t.plan(1);
    var b1 = new Buffer(10);
    var b2 = new buffer.Buffer(10);
    b1.fill(2);
    b2.fill(2);
    t.equal(b1.toString('hex'), b2.toString('hex'));
    t.end();
})
