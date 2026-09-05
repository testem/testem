const KEY_ACTIONS = {
  q: 'quit',
  Q: 'quit',
  CTRL_C: 'quit',
  ENTER: 'run',
  p: 'togglePause',
  LEFT: 'prevTab',
  RIGHT: 'nextTab',
  UP: 'scrollUp',
  DOWN: 'scrollDown',
  TAB: 'toggleFocus',
  ' ': 'pageDown',
  b: 'pageUp',
  u: 'halfPageUp',
  d: 'halfPageDown'
};

function actionForKey(name) {
  return KEY_ACTIONS[name];
}

function actionForRawByte(byte) {
  if (byte === 0x03) {
    return 'quit';
  }
  if (byte === 0x0d || byte === 0x0a) {
    return 'run';
  }
  if (byte === 0x1b) {
    return null;
  }
  return actionForKey(String.fromCharCode(byte));
}

module.exports = {
  KEY_ACTIONS,
  actionForKey,
  actionForRawByte
};
