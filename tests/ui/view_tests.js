'use strict';

var expect = require('chai').expect;
var View = require('../../lib/reporters/dev/view');
var Backbone = require('backbone');
var sinon = require('sinon');
var isWin = /^win/.test(process.platform);

describe('view', !isWin ? function() {
  var view;
  var MyView;
  var model;

  before(function() {
    model = new Backbone.Model();
    MyView = View.extend({
      render: function() {}
    });
    view = new MyView();
  });

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('can observe and then destroy', function() {
    var onNameChange = sandbox.spy();
    view.observe(model, 'change:name', onNameChange);
    model.set('name', 'Bob');
    expect(onNameChange).to.have.been.called();

    // destroy and remove handlers
    onNameChange.reset();
    view.destroy();
    model.set('name', 'Alice');
    expect(onNameChange).not.to.have.been.called();
  });

  it('can use alternate observe syntax', function() {
    var onNameChange = sandbox.spy();
    var onAgeChange = sandbox.spy();
    view.observe(model, {
      'change:name': onNameChange,
      'change:age': onAgeChange
    });
    model.set({name: 'Bob', age: 10});
    expect(onNameChange).to.have.been.called();
    expect(onAgeChange).to.have.been.called();
    view.destroy();
    onNameChange.reset();
    onAgeChange.reset();
    model.set({name: 'Alice', age: 12});
    expect(onNameChange).not.to.have.been.called();
    expect(onAgeChange).not.to.have.been.called();
  });

} : function() {
  xit('TODO: Fix and re-enable for windows');
});
