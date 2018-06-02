'use strict';

const expect = require('chai').expect;
const View = require('../../lib/reporters/dev/view');
const Backbone = require('backbone');
const sinon = require('sinon');
const isWin = /^win/.test(process.platform);

describe('view', !isWin ? function() {
  let view;
  let MyView;
  let model;

  before(function() {
    model = new Backbone.Model();
    MyView = View.extend({
      render: function() {}
    });
    view = new MyView();
  });

  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('can observe and then destroy', function() {
    let onNameChange = sandbox.spy();
    view.observe(model, 'change:name', onNameChange);
    model.set('name', 'Bob');
    expect(onNameChange).to.have.been.called();

    // destroy and remove handlers
    onNameChange.resetHistory();
    view.destroy();
    model.set('name', 'Alice');
    expect(onNameChange).not.to.have.been.called();
  });

  it('can use alternate observe syntax', function() {
    let onNameChange = sandbox.spy();
    let onAgeChange = sandbox.spy();
    view.observe(model, {
      'change:name': onNameChange,
      'change:age': onAgeChange
    });
    model.set({name: 'Bob', age: 10});
    expect(onNameChange).to.have.been.called();
    expect(onAgeChange).to.have.been.called();
    view.destroy();
    onNameChange.resetHistory();
    onAgeChange.resetHistory();
    model.set({name: 'Alice', age: 12});
    expect(onNameChange).not.to.have.been.called();
    expect(onAgeChange).not.to.have.been.called();
  });

} : function() {
  xit('TODO: Fix and re-enable for windows');
});
