module.exports = function (bufs, path) {
    var ix = indexOf(bufs, ' ', 0, 0);
    var jx = indexOf(bufs, ' ', ix[0], ix[1] + 1);
    
    var before = bufs[ix[0]].slice(0, ix[1] + 1);
    var after = bufs[jx[0]].slice(jx[1]);
    var middle = Buffer.isBuffer(path) ? path : new Buffer(path);
    
    bufs.splice(ix[0], jx[0] - ix[0] + 1, before, middle, after);
    
    return jx[2] - middle.length;
};

function indexOf (bufs, c, startI, startJ) {
    var code = c.charCodeAt(0);
    var bytes = 0;
    
    for (var i = startI; i < bufs.length; i++) {
        var buf = bufs[i];
        for (var j = i === startI ? startJ : 0; j < buf.length; j++) {
            if (buf[j] === code) return [ i, j, bytes ];
            bytes ++;
        }
    }
}
