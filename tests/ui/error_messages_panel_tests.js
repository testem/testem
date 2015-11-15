var expect = require('chai').expect;
var screen = require('./fake_screen');
var ErrorMessagesPanel = require('../../lib/dev/ui/error_messages_panel');
var Chars = require('../../lib/chars');

var isWin = /^win/.test(process.platform);

describe('ErrorMessagesPanel', !isWin ? function() {
  var panel;
  var ___ = [];
  ___.length = 11;
  ___ = ___.join(Chars.horizontal);
  beforeEach(function() {
    screen.$setSize(12, 12);
    panel = new ErrorMessagesPanel({
      line: 1,
      col: 1,
      width: 10,
      height: 10,
      text: 'blah',
      screen: screen
    });
  });
  it('initializes', function() {});

  it('renders', function() {
    panel.render();
    expect(screen.buffer).to.be.deep.equal([
      Chars.topLeft + ___ + Chars.topRight,
      Chars.vertical + 'blah      ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.vertical + '          ' + Chars.vertical,
      Chars.bottomLeft + ___ + Chars.bottomRight ]);
  });
  it('wraps the text', function() {
    panel.set('text', "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?");
    panel.render();
    expect(screen.buffer).to.be.deep.equal([
      Chars.topLeft + ___ + Chars.topRight,
      Chars.vertical + 'Sed ut per' + Chars.vertical,
      Chars.vertical + 'spiciatis ' + Chars.vertical,
      Chars.vertical + 'unde omnis' + Chars.vertical,
      Chars.vertical + ' iste natu' + Chars.vertical,
      Chars.vertical + 's error si' + Chars.vertical,
      Chars.vertical + 't voluptat' + Chars.vertical,
      Chars.vertical + 'em accusan' + Chars.vertical,
      Chars.vertical + 'tium dolor' + Chars.vertical,
      Chars.vertical + 'emque laud' + Chars.vertical,
      Chars.vertical + 'antium, to' + Chars.vertical,
      Chars.bottomLeft + ___ + Chars.bottomRight ]);
  });
  it('does not render if not visible', function() {
    screen.$setSize(12, 12);
    panel.set('visible', false);
    panel.render();
    expect(screen.buffer).to.be.deep.equal([
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ',
      '            ' ]);
  });

}: function() {
  xit('TODO: Fix and re-enable for windows');
});
