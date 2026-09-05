const KEY_ACTIONS = {
  q: 'quit',
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

module.exports = {
  KEY_ACTIONS,
  actionForKey
};
