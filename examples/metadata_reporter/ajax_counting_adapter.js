if (window.Testem) {
  window.Testem.useCustomAdapter(function(socket) {
    QUnit.testDone(function(details) {
      var ajaxCount = QUnit.config.current.testEnvironment.ajaxCallCounter.count;

      socket.emit('test-metadata', 'ajax-count', {
        testName: details.name,
        ajaxCount: ajaxCount
      });
    });
  });
}
