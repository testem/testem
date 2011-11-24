var spawn = require('child_process').spawn

function exec(){
    var p = spawn.apply(null, arguments)
    p.stdout.on('data', function(data){
        console.log(String(data))
    })
}

module.exports = exec