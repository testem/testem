const MARKUP_COLOR = {
  cyan: 'c',
  yellow: 'y',
  green: 'g',
  red: 'r',
  magenta: 'm',
  white: 'w'
};

function escapeMarkup(text) {
  return String(text === null || text === undefined ? '' : text).replace(/\^/g, '^^');
}

function segmentsToMarkup(segments) {
  return (segments || []).map(function (segment) {
    const code = MARKUP_COLOR[segment.color];
    const text = escapeMarkup(segment.text);
    return code ? '^' + code + text + '^' : text;
  }).join('');
}

module.exports = {
  MARKUP_COLOR,
  escapeMarkup,
  segmentsToMarkup
};
