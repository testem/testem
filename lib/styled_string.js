var Attributes = {
    display: {
        reset : 0,
        bright : 1,
        dim : 2,
        underscore : 4,
        blink : 5,
        reverse : 7,
        hidden : 8
    }
    , foreground: {
        black : 30,
        red : 31,
        green : 32,
        yellow : 33,
        blue : 34,
        magenta : 35,
        cyan : 36,
        white : 37
    }
    , background: {
        black : 40,
        red : 41,
        green : 42,
        yellow : 43,
        blue : 44,
        magenta : 45,
        cyan : 46,
        white : 47
    }
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
        if (this.attrs){
            for (var key in this.attrs){
                if (Attributes[key]){
                    var code = Attributes[key][this.attrs[key]]
                    if (code){
                        str = '\033[' + code + 'm' + str + '\033[0m'
                    }
                }
            }
        }
        return str
    }else{
        return this.children.reduce(function(curr, child){
            return curr + child.toString()
        }, '')
    }
}

module.exports = function(str, attrs, children){
    return new StyledString(str, attrs, children)
}