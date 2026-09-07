const { scriptTags, styleTags, loadScriptCalls } = require('./html');

const LOAD_SCRIPT_HELPER = `function applyScriptAttr(el, attr) {
  attr = String(attr).trim();
  var eq = attr.indexOf('=');
  if (eq === -1) {
    el.setAttribute(attr, '');
    return;
  }
  var name = attr.slice(0, eq);
  var value = attr.slice(eq + 1).replace(/^["']|["']$/g, '');
  el.setAttribute(name, value);
}
function loadScript(src) {
  var attrs = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    attrs.forEach(function(attr) { applyScriptAttr(s, attr); });
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}`;

function renderUmd({
  mochaCss, mochaJs, chaiJs, scripts, styles, footer_scripts
}) {
  return `<!doctype html>
<html>
<head>
<title>Test'em</title>
<link rel="stylesheet" href="${mochaCss}">
<script src="${mochaJs}"></script>
<script src="${chaiJs}"></script>
<script src="/testem.js"></script>
<script>mocha.setup('bdd')</script>
${scriptTags(scripts)}
${styleTags(styles)}
</head>
<body>
<div id="mocha"></div>
${scriptTags(footer_scripts)}
<script>
mocha.run()
</script>
</body>
</html>`;
}

function renderEsm({
  mochaCss, mochaJs, chaiJs, scripts, styles, footer_scripts
}) {
  const awaits = [loadScriptCalls(scripts), loadScriptCalls(footer_scripts)]
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html>
<head>
<title>Test'em</title>
<link rel="stylesheet" href="${mochaCss}">
<script src="${mochaJs}"></script>
<script src="/testem.js"></script>
<script>mocha.setup('bdd')</script>
${styleTags(styles)}
</head>
<body>
<div id="mocha"></div>
<script type="module">
import * as chai from '${chaiJs}';
globalThis.chai = chai;
${LOAD_SCRIPT_HELPER}
${awaits}
globalThis.mocha.run();
</script>
</body>
</html>`;
}

module.exports = function renderMochaChaiRunner(data) {
  return data.chaiLocal ? renderEsm(data) : renderUmd(data);
};
