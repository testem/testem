function MyReporter(out) {
    this.out = out || process.stdout;
    this.total = 0;
    this.pass = 0;
}

MyReporter.prototype = {
    report: function(prefix, data) {
        // increment counters
        this.total++;
        if (data.passed) {
            this.pass++;
        }
        // output results
        var status = data.passed ? 'ok' : 'failed';
        this.out.write(prefix+'\t'+status+'\t'+data.name.trim()+'\n');
    },
    finish: function() {
        this.out.write(this.passed+'/'+this.total+' tests passed\n')
    }
}

module.exports = MyReporter;
