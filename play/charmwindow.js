var charm = require('charm')(process),
    tty = require('tty'),
    spawn = require('child_process').spawn,
    log = require('winston')

log.add(log.transports.File, {filename: 'charmwindow.log'})
var width, height
var tputCols = spawn('tput', ['cols'])
tputCols.stdout.on('data', function(data){
    width = Number(String(data))
    log.info('width: ' + width)
    if (width && height)
        run()
})
var tputRows = spawn('tput', ['lines'])
tputRows.stdout.on('data', function(data){
    height = Number(String(data)) - 3
    //console.log('rows: ' + height)
    if (width && height)
        run()
})

function run(){
    initCharm()
    drawBox(0, 0, width, height)
}
    
function drawBox(x, y, width, height){
    var ul = '\u250f',
        ur = '\u2513',
        bl = '\u2517',
        br = '\u251b',
        h = '\u2501',
        v = '\u2503'
    charm.move(x, y)
    charm.write(ul)
    for (var i = 0; i < width - 2; i++)
        charm.write(h)
    charm.write(ur + '\n')
    for (var i = 0; i < height - 2; i++){
        charm.write(v)
        for (var j = 0; j < width - 2; j++)
            charm.write(' ')
        charm.write(v + '\n')
    }
    charm.write(bl)
    charm.position(0, height + 1)
    for (var i = 0; i < width - 2; i++)
        charm.write(h)
}

function initCharm(){
    charm.reset()
    charm.on('data', function(buf){
        charm.erase('screen')
        process.stdin.setRawMode(false)
        charm.destroy()
        process.exit()
    })
}