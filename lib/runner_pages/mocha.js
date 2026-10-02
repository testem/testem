import { scriptTags, styleTags } from "./html.js";

export default function renderMochaRunner({
  mochaCss, mochaJs, scripts, styles, footer_scripts
}) {
  return `<!doctype html>
<html>
<head>
<title>Test'em</title>
<link rel="stylesheet" href="${mochaCss}">
<script src="${mochaJs}"></script>
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