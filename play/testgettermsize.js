var getTermSize = require('./gettermsize1.js')

getTermSize(function(cols, lines){
    console.log('Terminal size is ' + cols + ', ' + lines)
})