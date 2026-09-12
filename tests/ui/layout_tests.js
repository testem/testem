const expect = require('chai').expect;
const { clampRect, appViewRects, tabLabelRects, panelRect } = require('../../lib/reporters/dev/layout');

function assertInside(rect, cols, lines) {
  expect(rect.x).to.be.at.least(0);
  expect(rect.y).to.be.at.least(0);
  expect(rect.x + rect.width).to.be.at.most(cols);
  expect(rect.y + rect.height).to.be.at.most(lines);
}

describe('TUI layout', function () {
  it('clamps a widget that starts past the last cell', function () {
    expect(clampRect(1, 38, 156, 1, 157, 38)).to.deep.equal({
      x: 1,
      y: 37,
      width: 156,
      height: 1
    });
  });

  it('keeps AppView chrome inside a 157x38 ScreenBuffer', function () {
    const rects = appViewRects(157, 38);
    expect(rects.footer).to.deep.equal({ x: 0, y: 37, width: 157, height: 1 });
    Object.keys(rects).forEach(function (name) {
      assertInside(rects[name], 157, 38);
    });
  });

  it('keeps tab labels and log panels inside the buffer', function () {
    assertInside(tabLabelRects(0, 157, 38).name, 157, 38);
    assertInside(tabLabelRects(0, 157, 38).status, 157, 38);
    assertInside(panelRect(0, 6, 157, 30, 157, 38), 157, 38);
  });
});
