var width = 100
var height = 100
var line = 0
var col = 0
var buffer = []
var foreground = null
var background = null

function initialize(){
    buffer = []
    for (var l = height; l--;){
        for (var c = width; c--;){
            buffer[l] = Array(width + 1).join(' ')
        }
    }
}
initialize()

var FakeScreen = {
    $setSize: function(w, h){
        width = w
        height = h
        initialize()
    }
    , $lines: function(start, end){
        if (end === undefined){
            end = start
            start = 0
        }
        return buffer.slice(start, end)
    }
    , foreground: function(color){
        foreground = color
        return this
    }
    , background: function(color){
        background = color
        return this
    }
    , position: function(_col, _line){
        col = _col
        line = _line - 1
        //console.error('position(' + col + ', ' + line + ')')
        return this
    }
    , write: function(str){
        //console.error('write(' + str + ')')
        var original = buffer[line]
        if (!original){
            return this
        }
        var before = original.substring(0, col)
        var after = original.substring(col + str.length)
        buffer[line] = (before + str + after).substring(0, width)
        col += str.length
        //console.error('line: ' + line)
        //console.error('buffer[line] ' + buffer[line])
        return this
    }
    , erase: function(){
        var original = buffer[line]
        if (!original) return this
        buffer[line] = original.substring(0, col) + Array(width - col + 1).join(' ')
        return this
    }
    , display: function(){
        return this
    }
}

Object.defineProperty(FakeScreen, 'buffer', {
    get: function(){
        return buffer
    }
})

module.exports = FakeScreen