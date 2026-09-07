function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrSuffix(attrs) {
  return (attrs || []).map(attr => ` ${attr}`).join('');
}

function scriptTags(files) {
  return (files || [])
    .map(file => `<script src="${file.src}"${attrSuffix(file.attrs)}></script>`)
    .join('');
}

function asHrefList(hrefs) {
  if (hrefs === undefined || hrefs === null || hrefs === '') {
    return [];
  }
  return Array.isArray(hrefs) ? hrefs : [hrefs];
}

function styleTags(hrefs) {
  return asHrefList(hrefs)
    .map(href => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join('');
}

function loadScriptCalls(files) {
  return (files || []).map(file => {
    const extra = (file.attrs || []).map(attr => `, '${attr}'`).join('');
    return `await loadScript('${file.src}'${extra});`;
  }).join('\n');
}

module.exports = {
  escapeHtml,
  attrSuffix,
  scriptTags,
  styleTags,
  loadScriptCalls
};
