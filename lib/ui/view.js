/*

view.js
==========

Base-class for our view-models.
*/

require('../patchcharm.js')
var charm = initCharm()
  , tty = require('tty')
  , log = require('winston')
  , getTermSize = require('../gettermsize')
  , Backbone = require('backbone')

// TODO fix tests for this. Make charm object swappable for testing.

function initCharm(){
    // A wrapper around charm (gives the same API) that automatically parks the cursor
    // to the bottom right corner when not in use
    var charm = function(charm){
        var timeoutID
        function parkCursor(){
            getTermSize(function(cols, lines){
                charm.position(cols, lines)
            })
        }
        function wrapFunc(func){
            return function(){
                if (timeoutID) clearTimeout(timeoutID)
                var retval = func.apply(charm, arguments)
                timeoutID = setTimeout(parkCursor, 150)
                return retval
            }
        }
        var cursorParker = {}
        for (var prop in charm){
            var value = charm[prop]
            if (typeof value === 'function'){
                cursorParker[prop] = wrapFunc(value)
            }
        }
        return cursorParker
    }(require('charm')(process))
    // allow charm.write() to take any object: just convert the passed in object to a string
    charm.write = function(charm, write){
        return function(obj){
            if (!(obj instanceof Buffer) && typeof obj !== 'string'){
                obj = String(obj)
            }
            return write.call(charm, obj)
        }
    }(charm, charm.write)
    return charm
}





// ============== Backbone-based View Models ============================


// View is the base class for our view models. That's right, view-models.
// All of our views carry state of some sort.
var View = module.exports = Backbone.Model.extend({
    charm: charm
    , observe: function(model, thing){
        var eventMap
        if (typeof thing === 'string' && arguments.length === 3){
            eventMap = {}
            eventMap[thing] = arguments[2]
        }else{
            eventMap = thing
        }
        for (var event in eventMap){
            model.on(event, eventMap[event])
        }
        if (!this.observers)
            this.observers = []
        this.observers.push([model, eventMap])
    }
    , destroy: function(){
        this.removeObservers()
    }
    , removeObservers: function(){
        if (!this.observers) return
        this.observers.forEach(function(observer){
            var model = observer[0]
              , eventMap = observer[1]
            for (var event in eventMap){
                model.off(event, eventMap[event])
            }
        })
    }
})
