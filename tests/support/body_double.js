var sinon = require('sinon')

module.exports = BodyDouble
function BodyDouble(obj, options){
  options = options || {}
  var retval = {}
  var fluent = options.fluent
  var override = options.override || {}
  for (var prop in obj){
    if (prop.charAt(0) === '_') continue
    var value = obj[prop]
    if (typeof value === 'function'){
      if (override[prop]){
        retval[prop] = override[prop]
        delete override[prop]
      }else{
        retval[prop] = sinon.stub()
        if (options.fluent){
          retval[prop].returns(retval)
        }
      }
    }
  }
  if (Object.keys(override).length > 0){
    throw new Error('Tried to override non-existing method(s): ' + 
      Object.keys(override).join(', ') + '.')
  }
  return retval
}