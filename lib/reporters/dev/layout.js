const constants = require('./constants');

function clampRect(x, y, width, height, cols, lines) {
  const maxX = Math.max(0, cols - 1);
  const maxY = Math.max(0, lines - 1);
  const left = Math.max(0, Math.min(x, maxX));
  const top = Math.max(0, Math.min(y, maxY));
  return {
    x: left,
    y: top,
    width: Math.max(1, Math.min(width, cols - left)),
    height: Math.max(1, Math.min(height, lines - top))
  };
}

function appViewRects(cols, lines) {
  return {
    title: clampRect(0, 0, cols, 1, cols, lines),
    hint: clampRect(0, 1, cols, 1, cols, lines),
    url: clampRect(0, 2, cols, 1, cols, lines),
    waiting: clampRect(0, Math.floor(lines / 2 + 1), cols, 1, cols, lines),
    footer: clampRect(0, lines - 1, cols, 1, cols, lines),
    popup: clampRect(4, 2, cols - 8, lines - 6, cols, lines)
  };
}

function tabLabelRects(index, cols, lines) {
  const x = Math.max(0, constants.TabStartCol - 1) + index * constants.TabWidth;
  const y = Math.max(0, constants.TabStartLine - 1);
  return {
    name: clampRect(x, y, constants.TabWidth, 1, cols, lines),
    status: clampRect(x, y + 1, constants.TabWidth, 1, cols, lines)
  };
}

function panelRect(col, line, width, height, cols, lines) {
  return clampRect(col, line, width || 1, height || 1, cols, lines);
}

function applyRect(widget, rect) {
  if (!widget || !rect) {
    return;
  }
  widget.outputX = rect.x;
  widget.outputY = rect.y;
  widget.outputWidth = rect.width;
  widget.outputHeight = rect.height;
}

module.exports = {
  clampRect,
  appViewRects,
  tabLabelRects,
  panelRect,
  applyRect
};
