const { scriptTags, styleTags } = require('./html');

module.exports = function renderJasmineRunner({
  scripts, styles, footer_scripts
}) {
  return `<!doctype html>
<html>
<head>
  <title>Test'em</title>
  <script src="//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine.js"></script>
  <script src="/testem.js"></script>
  <script src="//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine-html.js"></script>
  <script>
    (function() {
      var jasmineEnv = jasmine.getEnv()
      jasmineEnv.addReporter(new jasmine.HtmlReporter)

      window.onload = function() {
        jasmineEnv.execute()
      };
    })();
  </script>

  ${scriptTags(scripts)}

  <link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/jasmine/1.3.1/jasmine.css">

  ${styleTags(styles)}
</head>
<body>
  <div id="jasmine_content"></div>
</body>
${scriptTags(footer_scripts)}
</html>`;
};
