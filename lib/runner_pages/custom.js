const { scriptTags, styleTags } = require('./html');

module.exports = function renderCustomRunner({
  scripts, styles, footer_scripts
}) {
  return `<!doctype html>
<html>
<head>
  <title>Test'em</title>
  <script src="/testem.js"></script>
  ${scriptTags(scripts)}
  ${styleTags(styles)}
</head>
<body>
</body>
${scriptTags(footer_scripts)}
</html>`;
};
