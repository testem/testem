const { scriptTags, styleTags } = require('./html');

module.exports = function renderJasmine2Runner({
  jasmineJs,
  jasmineHtml,
  jasmineCss,
  jasmineBoot,
  jasmineSplitBoot,
  scripts,
  styles,
  footer_scripts
}) {
  const boot = jasmineSplitBoot
    ? `<script src="/node_modules/jasmine-core/lib/jasmine-core/boot0.js"></script>
  <script src="/node_modules/jasmine-core/lib/jasmine-core/boot1.js"></script>`
    : `<script src="${jasmineBoot || ''}"></script>`;

  return `<!doctype html>
<html>
<head>
  <title>Test'em</title>
  <script src="${jasmineJs}"></script>
  <script src="${jasmineHtml}"></script>
  ${boot}
  <script src="/testem.js"></script>

  ${scriptTags(scripts)}

  <link rel="stylesheet" href="${jasmineCss}">

  ${styleTags(styles)}
</head>
<body>
  <div id="jasmine_content"></div>
</body>
${scriptTags(footer_scripts)}
</html>`;
};
