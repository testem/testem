require.config({
  paths: {
    'testem': '/testem'
  }
});

require(['jasmine/jasmine'],function()
{
  require([
    'jasmine/jasmine-html',
    'testem',
    'specs/hello_spec'
  ],  function(){
      var env = jasmine.getEnv();
      env.addReporter(new jasmine.HtmlReporter);
      env.execute();
  });
});
