var Display = {
    red: function red(s){ return ["\033[31m", s, "\033[0m"].join('') }
    , green: function green(s){ return ["\033[32m", s, "\033[0m"].join('') }
    , cyan: function cyan(s){ return ["\033[36m", s, "\033[0m"].join('') }
    , yellow: function yellow(s){ return ["\033[33m", s, "\033[0m"].join('') }
    , blue: function blue(s){ return ["\033[34m", s, "\033[0m"].join('') }
}

function StyledString(str, attrs, children){
    this.str = str
    this.children = children
    this.length = str ? str.length : children.reduce(function(curr, child){
        return curr + child.length
    }, 0)
    this.attrs = attrs
}

StyledString.prototype.substring = function(){
    var str = this.str.substring.apply(this.str, arguments)
    return new StyledString(str, this.attrs)
}

StyledString.prototype.match = function(){
    return this.str.match.apply(this.str, arguments)
}

StyledString.prototype.concat = function(){
    var args = Array.prototype.slice.apply(arguments)
    if (this.children){
        return new StyledString(null, null, this.children.concat(args))
    }else{
        var children = [this].concat(Array.prototype.slice.apply(args))
        return new StyledString(null, null, children)
    }
}

StyledString.prototype.toString = function(){
    if (this.str){
        var str = this.str
        var foreground = this.attrs ? this.attrs.foreground : null
        if (foreground)
            str = Display[foreground](str)
        return str
    }else{
        return this.children.reduce(function(curr, child){
            return curr + child.toString()
        }, '')
    }
}

module.exports = StyledString