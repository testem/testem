module.exports = function splitLines(text, colLimit){
    if (!text) return []
    var firstSplit = text.split('\n')
    var secondSplit = []
    firstSplit.forEach(function(line){
        while (line.length > colLimit){
            var first = line.substring(0, colLimit)
            secondSplit.push(first)
            line = line.substring(colLimit)
        }
        if (line.length > 0) secondSplit.push(line)
    })
    return secondSplit
}