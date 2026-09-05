const termkit = require('terminal-kit');
const View = require('./view');
const constants = require('./constants');
const displayText = require('./display_text');
const { segmentsToMarkup } = require('./markup');

const TEXTBOX_KEY_BINDINGS = {
  UP: 'tinyScrollUp',
  DOWN: 'tinyScrollDown',
  PAGE_UP: 'scrollUp',
  PAGE_DOWN: 'scrollDown',
  HOME: 'scrollTop',
  END: 'scrollBottom'
};

function createPanel(document, attrs) {
  const state = {
    height: attrs.height || 0,
    width: attrs.width || 0,
    line: attrs.line || 0,
    col: attrs.col || 0,
    visible: !!attrs.visible,
    text: '',
    scrollOffset: 0
  };

  let box = null;
  if (document) {
    box = new termkit.TextBox({
      parent: document,
      x: Math.max(1, state.col + 1),
      y: Math.max(1, state.line + 1),
      width: Math.max(1, state.width || 1),
      height: Math.max(1, state.height || 1),
      scrollable: true,
      hidden: !state.visible || state.height === 0,
      keyBindings: TEXTBOX_KEY_BINDINGS,
      contentHasMarkup: true,
      noDraw: true
    });
  }

  function apply() {
    if (!box) {
      return;
    }
    const hidden = !state.visible || state.height <= 0;
    box.hidden = hidden;
    if (!hidden) {
      box.setSizeAndPosition({
        outputX: Math.max(1, state.col + 1),
        outputY: Math.max(1, state.line + 1),
        outputWidth: Math.max(1, state.width || 1),
        outputHeight: Math.max(1, state.height || 1)
      });
    }
  }

  return {
    box,
    set(key, value) {
      if (typeof key === 'object') {
        Object.assign(state, key);
      } else {
        state[key] = value;
      }
      if (box && Object.prototype.hasOwnProperty.call(state, 'text') && (key === 'text' || (typeof key === 'object' && key.text !== undefined))) {
        box.setContent(state.text, true, true);
      }
      apply();
    },
    get(key) {
      return state[key];
    },
    scrollUp() {
      if (box) {
        box.scroll(0, 1);
      }
    },
    scrollDown() {
      if (box) {
        box.scroll(0, -1);
      }
    },
    pageUp() {
      const dy = Math.max(1, state.height || (box && box.textAreaHeight) || 1);
      if (box) {
        box.scroll(0, dy);
      }
    },
    pageDown() {
      const dy = Math.max(1, state.height || (box && box.textAreaHeight) || 1);
      if (box) {
        box.scroll(0, -dy);
      }
    },
    halfPageUp() {
      const dy = Math.max(1, Math.ceil((state.height || (box && box.textAreaHeight) || 1) / 2));
      if (box) {
        box.scroll(0, dy);
      }
    },
    halfPageDown() {
      const dy = Math.max(1, Math.ceil((state.height || (box && box.textAreaHeight) || 1) / 2));
      if (box) {
        box.scroll(0, -dy);
      }
    },
    render() {
      if (box && !box.hidden) {
        box.draw();
      }
    }
  };
}

module.exports = View.extend({
  defaults: {
    visible: false,
    focus: 'top'
  },
  initialize() {
    const runner = this.get('runner');
    const results = runner.get('results');
    const messages = runner.get('messages');
    const appview = this.get('appview');
    const visible = this.get('visible');
    const document = appview && appview.document;
    const self = this;

    this.topPanel = createPanel(document, {
      line: constants.TabStartLine + constants.TabHeight - 1,
      col: 0,
      visible: visible
    });
    this.bottomPanel = createPanel(document, {
      col: 0,
      visible: visible
    });

    if (appview) {
      this.observe(appview, 'change:cols change:lines', function () {
        self.syncDimensions();
        self.render();
      });
    }
    if (results) {
      this.observe(results, 'change', function () {
        self.syncDimensions();
        self.syncResultsDisplay();
      });
    }
    if (messages) {
      this.observe(messages, 'reset add remove', function () {
        self.syncDimensions();
        self.syncMessages();
      });
    }
    this.observe(this, 'change:visible', function () {
      const isVisible = self.get('visible');
      self.topPanel.set('visible', isVisible);
      self.bottomPanel.set('visible', isVisible);
      self.syncDimensions();
      self.render();
    });
    this.syncDimensions();
    this.syncResultsDisplay();
    this.syncMessages();
    this.render();
  },
  toggleFocus() {
    const focus = this.get('focus');
    this.set('focus', focus === 'top' ? 'bottom' : 'top');
    const appview = this.get('appview');
    const target = this.targetPanel();
    if (appview && appview.document && target.box) {
      appview.document.giveFocusTo(target.box);
    }
  },
  resetScrollPositions() {
    this.topPanel.set('scrollOffset', 0);
    this.bottomPanel.set('scrollOffset', 0);
    if (this.topPanel.box) {
      this.topPanel.box.scrollToTop(true);
    }
    if (this.bottomPanel.box) {
      this.bottomPanel.box.scrollToTop(true);
    }
  },
  targetPanel() {
    const runner = this.get('runner');
    const bottomPanel = this.bottomPanel;
    const topPanel = this.topPanel;
    if (runner.hasMessages() && runner.hasResults()) {
      return this.get('focus') === 'top' ? topPanel : bottomPanel;
    }
    if (runner.hasMessages()) {
      return bottomPanel;
    }
    return topPanel;
  },
  scrollUp() {
    this.targetPanel().scrollUp();
  },
  scrollDown() {
    this.targetPanel().scrollDown();
  },
  pageUp() {
    this.targetPanel().pageUp();
  },
  pageDown() {
    this.targetPanel().pageDown();
  },
  halfPageUp() {
    this.targetPanel().halfPageUp();
  },
  halfPageDown() {
    this.targetPanel().halfPageDown();
  },
  syncMessages() {
    this.bottomPanel.set('text', segmentsToMarkup(this.getMessagesText()));
  },
  syncResultsDisplay() {
    this.topPanel.set('text', segmentsToMarkup(this.getResultsDisplayText()));
  },
  syncDimensions() {
    const appview = this.get('appview');
    const termCols = appview.get('cols') || 80;
    const termLines = appview.get('lines') || 24;
    const runner = this.get('runner');
    if (runner.hasMessages() && runner.hasResults()) {
      const midLine = Math.floor((termLines - constants.LogPanelUnusedLines) / 2);
      this.topPanel.set({
        height: midLine,
        width: termCols
      });
      const line = midLine + constants.TabStartLine + constants.TabHeight - 1;
      this.bottomPanel.set({
        line: line,
        height: termLines - line - 1,
        width: termCols
      });
    } else if (runner.hasMessages()) {
      this.topPanel.set({
        height: 0,
        width: termCols
      });
      const height = termLines - constants.LogPanelUnusedLines;
      this.bottomPanel.set({
        line: constants.TabStartLine + constants.TabHeight - 1,
        height: height,
        width: termCols
      });
    } else {
      const topPanelHeight = termLines - constants.LogPanelUnusedLines;
      this.topPanel.set({
        height: topPanelHeight,
        width: termCols
      });
      this.bottomPanel.set({
        line: constants.TabStartLine + constants.TabHeight + topPanelHeight,
        height: 0,
        width: termCols
      });
    }
  },
  render() {
    const appview = this.get('appview');
    if (appview && appview.injectedTerm) {
      return;
    }
    this.topPanel.render();
    this.bottomPanel.render();
  },
  getResultsDisplayText() {
    return displayText.getResultsDisplayText(this.get('runner').get('results'));
  },
  getMessagesText() {
    return displayText.getMessagesText(this.get('runner').get('messages'));
  }
});
