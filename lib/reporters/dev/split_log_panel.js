

var View = require('./view');
var ScrollableTextPanel = require('./scrollable_text_panel');
var tabs = require('./constants');
var Screen = require('./screen');
var displayText = require('./display_text');

module.exports = View.extend({
  defaults: {
    visible: false,
    focus: 'top'
  },
  initialize: function() {
    if (!this.get('screen')) {
      this.set('screen', new Screen());
    }
    var runner = this.get('runner');
    var results = runner.get('results');
    var messages = runner.get('messages');
    var appview = this.get('appview');
    var visible = this.get('visible');
    var self = this;
    var screen = this.get('screen');
    var topPanel = this.topPanel = new ScrollableTextPanel({
      line: tabs.TabStartLine + tabs.TabHeight - 1,
      col: 0,
      visible: visible,
      screen: screen
    });
    var bottomPanel = this.bottomPanel = new ScrollableTextPanel({
      col: 0,
      visible: visible,
      screen: screen
    });
    this.observe(appview, 'change:cols change:lines', function() {
      self.syncDimensions();
      self.render();
    });
    if (results) {
      this.observe(results, 'change', function() {
        self.syncDimensions();
        self.syncResultsDisplay();
      });
    }
    this.observe(messages, 'reset add remove', function() {
      self.syncDimensions();
      self.syncMessages();
    });
    this.observe(this, 'change:visible', function() {
      var visible = self.get('visible');
      topPanel.set('visible', visible, {silent: true});
      bottomPanel.set('visible', visible, {silent: true});
      self.syncDimensions({silent: true});
      self.render();
    });
    this.syncDimensions({silent: true});
    this.syncResultsDisplay({silent: true});
    this.syncMessages({silent: true});
    this.render();
  },
  toggleFocus: function() {
    var focus = this.get('focus');
    this.set('focus', focus === 'top' ? 'bottom' : 'top');
  },
  resetScrollPositions: function() {
    this.topPanel.set('scrollOffset', 0);
    this.bottomPanel.set('scrollOffset', 0);
  },
  targetPanel: function() {
    var runner = this.get('runner');
    var bottomPanel = this.bottomPanel;
    var topPanel = this.topPanel;
    if (runner.hasMessages() && runner.hasResults()) {
      return (this.get('focus') === 'top') ? topPanel : bottomPanel;
    } else if (runner.hasMessages()) {
      return bottomPanel;
    } else if (runner.hasResults()) {
      return topPanel;
    } else {
      return topPanel;
    }
  },
  scrollUp: function() {
    this.targetPanel().scrollUp();
  },
  scrollDown: function() {
    this.targetPanel().scrollDown();
  },
  pageUp: function() {
    this.targetPanel().pageUp();
  },
  pageDown: function() {
    this.targetPanel().pageDown();
  },
  halfPageUp: function() {
    this.targetPanel().halfPageUp();
  },
  halfPageDown: function() {
    this.targetPanel().halfPageDown();
  },
  syncMessages: function(options) {
    this.bottomPanel.set('text', this.getMessagesText(), options);
  },
  syncResultsDisplay: function(options) {
    this.topPanel.set('text', this.getResultsDisplayText(), options);
  },
  syncDimensions: function(options) {
    var appview = this.get('appview');
    var termCols = appview.get('cols');
    var termLines = appview.get('lines');
    var runner = this.get('runner');
    if (runner.hasMessages() && runner.hasResults()) {
      var midLine = Math.floor((termLines - tabs.LogPanelUnusedLines) / 2);

      this.topPanel.set({
        height: midLine,
        width: termCols
      }, options);
      var line = midLine + tabs.TabStartLine + tabs.TabHeight - 1;
      var bottomPanelAttrs = {
        line: line,
        height: termLines - line - 1,
        width: termCols
      };
      this.bottomPanel.set(bottomPanelAttrs, options);
    } else if (runner.hasMessages()) { // only has messages
      this.topPanel.set({
        height: 0,
        width: termCols
      }, options);
      var height = termLines - tabs.LogPanelUnusedLines;
      this.bottomPanel.set({
        line: tabs.TabStartLine + tabs.TabHeight - 1,
        height: height,
        width: termCols
      }, options);
    } else { // only has results

      // Hide the bottom panel if there are no messages
      // to be displayed
      var topPanelHeight = termLines - tabs.LogPanelUnusedLines;
      this.topPanel.set({
        height: topPanelHeight,
        width: termCols
      }, options);
      this.bottomPanel.set({
        line: tabs.TabStartLine + tabs.TabHeight + topPanelHeight,
        height: 0,
        width: termCols
      }, options);
    }
  },
  render: function() {
    this.topPanel.render();
    this.bottomPanel.render();
  },
  getResultsDisplayText: function() {
    return displayText.getResultsDisplayText(this.get('runner').get('results'));
  },
  getMessagesText: function() {
    return displayText.getMessagesText(this.get('runner').get('messages'));
  }
});
