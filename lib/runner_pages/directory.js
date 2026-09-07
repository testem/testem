const { escapeHtml } = require('./html');

module.exports = function renderDirectoryListing({ files }) {
  const items = (files || []).map(name => {
    const safe = escapeHtml(name);
    return `<li><a href="${safe}">${safe}</a></li>`;
  }).join('');
  return `<h1>Files In This Directory</h1>
<ul>
${items}
</ul>`;
};
