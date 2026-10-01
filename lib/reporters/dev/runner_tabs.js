const SplitLogPanel = require('./split_log_panel');
const View = require('./view');
const Backbone = require('backbone');
const pad = require('../../utils/strutils').pad;
const Chars = require('../../utils/chars');
const toastNotify = require('./toast_notify');
const constants = require('./constants');
const { tabColor } = require('./tab_status');
const { escapeMarkup } = require('./markup');
const { tabLabelRects } = require('./layout');

const TabWidth = constants.TabWidth;
const TabStartLine = constants.TabStartLine;
const TabStartCol = constants.TabStartCol;

const COLOR_MARKUP = {
  green: 'g',
  yellow: 'y',
  red: 'r'
};

const RunnerTab = (exports.RunnerTab = View.extend({
  defaults: {
    allPassed: true
  },
  col: TabStartCol,
  line: TabStartLine,
  height: constants.TabHeight,
  width: TabWidth,
  initialize() {
    const runner = this.get('runner');
    const results = runner.get('results');
    const index = this.get('index');
    const appview = this.get('appview');
    const app = appview.app;
    const config = app.config;
    const self = this;
    const visible = appview.get('currentTab') === index;
    const document = appview.document;

    this.splitPanel = new SplitLogPanel({
      runner: runner,
      appview: appview,
      visible: visible
    });

    this.spinnerIdx = 0;

    if (document) {
      const termkit = require('terminal-kit');
      const rects = tabLabelRects(index, appview.get('cols'), appview.get('lines'));
      this.nameLabel = new termkit.Text({
        parent: document,
        x: rects.name.x,
        y: rects.name.y,
        width: rects.name.width,
        height: rects.name.height,
        contentHasMarkup: true,
        noDraw: true
      });
      this.statusLabel = new termkit.Text({
        parent: document,
        x: rects.status.x,
        y: rects.status.y,
        width: rects.status.width,
        height: rects.status.height,
        contentHasMarkup: true,
        noDraw: true
      });
    }

    function handleCurrentTab() {
      self.set('selected', appview.get('currentTab') === self.get('index'));
    }

    this.observe(appview, {
      'change:currentTab': handleCurrentTab
    });
    this.observe(runner, {
      'change:name'() {
        self.renderRunnerName();
      },
      'tests-start'() {
        self.set('allPassed', true);
        self.splitPanel.resetScrollPositions();
        self.startSpinner();
      },
      'tests-end'() {
        self.stopSpinner();
        self.renderResults();
        self.renderRunnerName();
        if (config.get('growl')) {
          self.growlResults();
        }
      },
      'change:allPassed'(model, value) {
        self.set('allPassed', value);
      }
    });

    if (results) {
      this.observe(results, {
        change() {
          const current = runner.get('results');
          if (!current) {
            self.set('allPassed', true);
          } else {
            const passed = current.get('passed');
            const total = current.get('total');
            const pending = current.get('pending');
            const allPassed = passed + pending === total;
            const hasTests = total > 0;
            const failCuzNoTests = !hasTests && config.get('fail_on_zero_tests');
            const hasError =
              runner.get('messages').filter(function (m) {
                return m.get('type') === 'error';
              }).length > 0;
            self.set('allPassed', allPassed && !failCuzNoTests && !hasError);
          }
          // allPassed often does not change during a green run, so the counts
          // have to be redrawn from the results themselves.
          self.renderResults();
        },
        'change:all'() {
          self.renderResults();
        }
      });
    }

    this.observe(appview, 'change:isPopupVisible', () => {
      this.updateSplitPanelVisibility();
    });

    this.observe(this, {
      'change:selected'() {
        self.updateSplitPanelVisibility();
      },
      'change:index change:selected'() {
        self.render();
      },
      'change:allPassed'() {
        process.nextTick(() => {
          self.renderRunnerName();
          self.renderResults();
        });
      }
    });
    this.render();
    handleCurrentTab();
  },

  updateSplitPanelVisibility() {
    const appview = this.get('appview');
    this.splitPanel.set(
      'visible',
      this.get('selected') && !appview.isPopupVisible()
    );
  },

  color() {
    const config = this.get('appview').app.config;
    const results = this.get('runner').get('results');
    return tabColor(results, config.get('fail_on_zero_tests'));
  },

  startSpinner() {
    this.stopSpinner();
    const self = this;
    function render() {
      self.renderResults();
      self.setTimeoutID = setTimeout(render, 150);
    }
    render();
  },

  stopSpinner() {
    if (this.setTimeoutID) {
      clearTimeout(this.setTimeoutID);
      this.setTimeoutID = null;
    }
  },

  isPopupVisible() {
    const appview = this.get('appview');
    return appview && appview.isPopupVisible();
  },

  _skipDraw() {
    const appview = this.get('appview');
    return !!(appview && appview.injectedTerm);
  },

  render() {
    if (this.isPopupVisible()) {
      return;
    }
    this.renderTab();
    this.renderRunnerName();
    this.renderResults();
  },

  styled(text) {
    const code = COLOR_MARKUP[this.color()] || 'w';
    const bold = this.get('selected') ? '^+' : '';
    return bold + '^' + code + escapeMarkup(text) + '^';
  },

  renderRunnerName() {
    if (this.isPopupVisible() || !this.nameLabel) {
      return;
    }
    const runnerName = this.get('runner').get('name');
    const runnerDisplayName = pad(runnerName || '', this.width - 2, ' ', 2);
    this.nameLabel.setContent(this.styled(runnerDisplayName), true, this._skipDraw());
  },

  renderResults() {
    if (this.isPopupVisible() || !this.statusLabel) {
      return;
    }

    const runner = this.get('runner');
    const results = runner.get('results');
    let resultsDisplay = '';
    let equal = true;

    if (results) {
      const total = results.get('total');
      const passed = results.get('passed');
      const pending = results.get('pending');
      resultsDisplay = passed + '/' + total;
      equal = passed + pending === total;
    }

    if (results && results.get('all')) {
      resultsDisplay +=
        ' ' + (this.get('allPassed') && equal ? Chars.success : Chars.fail);
    } else if (!results && runner.get('allPassed') !== undefined) {
      resultsDisplay = runner.get('allPassed') ? Chars.success : Chars.fail;
    } else {
      resultsDisplay += ' ' + Chars.spinner[this.spinnerIdx++];
      if (this.spinnerIdx >= Chars.spinner.length) {
        this.spinnerIdx = 0;
      }
    }

    resultsDisplay = pad(resultsDisplay, this.width - 4, ' ', 2);
    this.statusLabel.setContent(this.styled(resultsDisplay), true, this._skipDraw());
  },

  growlResults() {
    const runner = this.get('runner');
    const results = runner.get('results');
    const name = runner.get('name');
    const resultsDisplay = results
      ? results.get('passed') + '/' + results.get('total')
      : 'finished';

    toastNotify.notify({
      title: "Test'em",
      message: name + ' : ' + resultsDisplay
    });
  },

  renderTab() {
    this.renderRunnerName();
    this.renderResults();
  },

  destroy() {
    this.stopSpinner();
    if (this.splitPanel) {
      this.splitPanel.destroy();
    }
    if (this.nameLabel) {
      this.nameLabel.destroy();
    }
    if (this.statusLabel) {
      this.statusLabel.destroy();
    }
    View.prototype.destroy.call(this);
  }
}));

exports.RunnerTabs = Backbone.Collection.extend({
  model: RunnerTab,
  initialize(arr, attrs) {
    this.appview = attrs.appview;
    const self = this;
    this.on('remove', (removed) => {
      let currentTab = self.appview.get('currentTab');
      if (currentTab >= self.length) {
        currentTab--;
        self.appview.set('currentTab', currentTab, { silent: true });
      }
      self.forEach((runner, idx) => {
        runner.set({
          index: idx,
          selected: idx === currentTab
        });
      });
      removed.destroy();
    });
    this.appview.on(
      'change:isPopupVisible change:lines change:cols',
      function () {
        self.reRenderAll();
      }
    );
  },

  reRenderAll() {
    this.render();
  },

  render() {
    if (this.isPopupVisible()) {
      return;
    }
    this.invoke('render');
  },

  isPopupVisible() {
    const appview = this.appview;
    return appview && appview.isPopupVisible();
  }
});
