function AjaxCountingReporter(out) {
  this.out = out || process.stdout;
  this.counts = {};
}

AjaxCountingReporter.prototype = {

  reportMetadata: function(tag, metadata) {
    if (tag === 'ajax-count') {
      this.counts[metadata.testName] = metadata.ajaxCount;
    }
  },

  report: function() {
    // do nothing
  },

  finish: function() {
    this.out.write('\nAJAX call count report: \n');
    this.out.write(JSON.stringify(this.counts, null, 2) + '\n');
  }
};

module.exports = AjaxCountingReporter;
