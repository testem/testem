// String padding function adapted from <http://jsfromhell.com/string/pad>
function pad(str, l, s, t){
    var ol = l
    return (s || (s = " "), (l -= str.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + str + s.substr(0, l - t) : str).substring(0, ol)
}

function indent(text){
    return text.split('\n').map(function(line){
        return '    ' + line
    }).join('\n')
}

exports.pad = pad
exports.indent = indent