'use strict';

var AppView = require('../../lib/reporters/dev');
var Backbone = require('backbone');
var Config = require('../../lib/config');
var screen = require('./fake_screen');
var expect = require('chai').expect;

var isWin = /^win/.test(process.platform);

describe('AppView', !isWin ? function() {

  var appview, app, config;

  beforeEach(function() {
    app = new Backbone.Model();
    app.url = 'http://localhost:1234';
    config = app.config = new Config({}, {port: 1234});
    app.runners = new Backbone.Collection();
    appview = new AppView(
      false, process.stdout, config, app, screen
    );
    screen.$setSize(80, 10);
    appview.set({cols: 80, lines: 10});
  });

  it('initializes', function() {
    appview.renderTop();
    appview.renderMiddle();
    appview.renderBottom();
  });

  it('starts off showing p to pause', function() {
    appview.renderBottom();
    expect(appview.get('screen').buffer.join('')).to.contain('p to pause');
  });

  it('says its paused when paused', function() {
    app.paused = true;
    appview.renderBottom();
    expect(appview.get('screen').buffer.join('')).to.contain('p to unpause');
  });
} : function() {
  xit('TODO: Fix and re-enable for windows');
});
