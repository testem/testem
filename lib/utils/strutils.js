// String padding function adapted from <http://jsfromhell.com/string/pad>
export const pad = function pad(str, l, s, t) {
  let ol = l;
  return (s || (s = ' '), (l -= str.length) > 0 ?
    (s = new Array(Math.ceil(l / s.length) + 1).join(s))
      .substr(0, t = !t ? l : t === 1 ? 0 :
        Math.ceil(l / 2)) + str + s.substr(0, l - t) : str).substring(0, ol);
}
export const indent = function indent(text, width) {
  return text.split('\n').map(line => {
    return new Array((width || 4) + 1).join(' ') + line;
  }).join('\n');
}
export const splitLines = function splitLines(text, colLimit) {
  if (!text) {
    return [];
  }
  let firstSplit = text.split('\n');
  let secondSplit = [];
  firstSplit.forEach(line => {
    while (line.length > colLimit) {
      let first = line.substring(0, colLimit);
      secondSplit.push(first);
      line = line.substring(colLimit);
    }
    secondSplit.push(line);
  });
  return secondSplit;
}
// Simple template function. Replaces occurences of "<name>" with param[name]
export const template = function template(str, params) {
  return !str.replace ? str : str.replace(/<(.+?)>/g, (unchanged, name) => {
    return name in params ? params[name] : unchanged;
  });
}
export const isString = function(x) {
  return Object.prototype.toString.call(x) === '[object String]';
}