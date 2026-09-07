const { scriptTags, styleTags } = require('./html');

module.exports = function renderQunitRunner({
  qunitJs, qunitCss, scripts, styles, footer_scripts
}) {
  return `<!doctype html>
<html>
<head>
<title>Test'em</title>
<script src="${qunitJs}"></script>
<script src="/testem.js"></script>
${scriptTags(scripts)}
<link rel="stylesheet" href="${qunitCss}"/>
${styleTags(styles)}
</head>
<body>
<div id="qunit"></div>
<div id="qunit-fixture"></div>
</body>
${scriptTags(footer_scripts)}
</html>`;
};
