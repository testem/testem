var expect = require('chai').expect
var View = require('../../lib/dev/ui/view')
var Backbone = require('backbone')
var spy = require('ispy')
var isWin = /^win/.test(process.platform)

describe('view', !isWin ? function(){
  var view
  var MyView
  var model
  before(function(){
    model = new Backbone.Model()
    MyView = View.extend({
      render: function(){}
    })
    view = new MyView()
  })

  it('can observe and then destroy', function(){
    var onNameChange = spy()
    view.observe(model, 'change:name', onNameChange)
    model.set('name', 'Bob')
    expect(onNameChange.called).to.be.ok

    // destroy and remove handlers
    onNameChange.reset()
    view.destroy()
    model.set('name', 'Alice')
    expect(onNameChange.called).not.to.be.ok
  })

  it('can use alternate observe syntax', function(){
    var onNameChange = spy()
    var onAgeChange = spy()
    view.observe(model, {
      'change:name': onNameChange,
      'change:age': onAgeChange
    })
    model.set({name: 'Bob', age: 10})
    expect(onNameChange.called && onAgeChange.called).to.be.ok
    view.destroy()
    onNameChange.reset()
    onAgeChange.reset()
    model.set({name: 'Alice', age: 12})
    expect(onNameChange.called || onAgeChange.called).not.to.be.ok
  })

}: function() {
  xit('TODO: Fix and re-enable for windows')
})
