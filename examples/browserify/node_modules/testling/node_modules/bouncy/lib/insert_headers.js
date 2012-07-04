module.exports = function (bufs, headers) {
    var bytesAdded = 0;
    
    var insert = [];
    for (var key in headers) {
        if (typeof headers[key] === 'string' || headers[key]) {
            var b = new Buffer(key + ': ' + headers[key] + '\r\n');
            insert.push(b);
            bytesAdded += b.length;
        }
    }
    if (insert.length === 0) return 0;
    
    var w = new Buffer(4);
    var ix = [], jx = [];
    
    for (var i = 0; i < bufs.length; i++) {
        var buf = bufs[i];
        for (var j = 0; j < buf.length; j++) {
            w[0] = w[1], ix[0] = ix[1], jx[0] = jx[1];
            w[1] = w[2], ix[1] = ix[2], jx[1] = jx[2];
            w[2] = w[3], ix[2] = ix[3], jx[2] = jx[3];
            w[3] = buf[j], ix[3] = i, jx[3] = j;
            
            if (w[2] === 10 && w[3] === 10
            || (w[0] === 13 && w[1] === 10 && w[2] === 13 && w[3] === 10)) {
                if (w[2] === 10 && w[3] === 10) {
                    var ii = ix[1];
                    var jj = jx[1];
                }
                else {
                    var ii = ix[2];
                    var jj = jx[2];
                }
                
                if (jj > 0) insert.unshift(bufs[ii].slice(0, jj));
                insert.push(bufs[ii].slice(jj, bufs[ii].length));
                
                insert.unshift(ii, 1);
                bufs.splice.apply(bufs, insert);
                return bytesAdded;
            }
        }
    }
    
    return 0;
}
