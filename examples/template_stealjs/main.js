System.import('qunit').then(function() {
  System.import('testem').then(function() {
      var loader = [];
      testSuite.forEach(function(res)
      {
        loader.push(System.import(res.replace('.js', '')));
      });

      Promise.all(loader).then(function(){
        QUnit.start();
      });
  });
});
