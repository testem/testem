const { scriptTags } = require('./html');

module.exports = function renderTapRunner({ scripts, footer_scripts }) {
  return `<!doctype html>
<html>
<head>
<title>Test'em</title>
<script src="/testem.js"></script>
</head>
<body>
<h1>TAP</h1>
<pre id="log"></pre>
<script>
var log = document.getElementById('log')
Testem.handleConsoleMessage = function(msg){
  Testem.emit('tap', msg)
  log.appendChild(document.createTextNode(msg + '\\n'))
  return false
}
</script>
${scriptTags(scripts)}
${scriptTags(footer_scripts)}
</body>
</html>`;
};
