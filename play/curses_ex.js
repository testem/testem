var nc=require('ncurses');
function pad(num) {
  num = ''+num;
  var digits = num.length;
  if (digits < 3)
    num = '0' + num;
  if (digits < 2)
    num = '0' + num;
  return num;
}
var w = new nc.Window();
nc.showCursor = false;
if (nc.hasColors) {
  var color = 0, pair = 1, breakout = false;
  for (var col=0; col<nc.cols; col+=3) {
    for (var ln=0; ln<nc.lines; ln++) {
      if (color === nc.numColors) {
        breakout = true;
        break;
      }
      
      nc.colorPair(pair, nc.colors.BLACK, color);
      w.attrset(nc.colorPair(pair++));
      w.addstr(ln, col, pad(color++));
    }
    if (breakout)
      break;
  }
  w.refresh();
  setTimeout(function() { w.close(); }, 5000);
} else {
  w.close();
  console.log('Sorry, this example requires a terminal capable of displaying color.');
}