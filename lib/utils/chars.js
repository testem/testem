import is_winMod from "./is-win.js";

const isWin = is_winMod();

// Special characters to use for drawing.
const winChars = {
  horizontal: '-',
  vertical: '|',
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  fail: 'x',
  success: 'v',
  cross: 'x',
  spinner: '-\\|/',
  dot: '.',
  mark: 'x'
};

const unicodeChars = {
  horizontal: '\u2501',
  vertical: '\u2503',
  topLeft: '\u250f',
  topRight: '\u2513',
  bottomLeft: '\u2517',
  bottomRight: '\u251b',
  fail: '\u2718',
  success: '\u2714',
  cross: '\u2718',
  spinner: '\u25dc\u25dd\u25de\u25df',
  dot: '\u00b7',
  mark: '\u2714'
};

export default isWin ? winChars : unicodeChars;
