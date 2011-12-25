var browserName = (function(){
    var userAgent = navigator.userAgent
    var regexs = [
        /MS(?:(IE) ([0-9]\.[0-9]))/,
        /(Chrome)\/([0-9]+\.[0-9]+)/,
        /(Firefox)\/([0-9a-z]+\.[0-9a-z]+)/,
        /(Opera).*Version\/([0-9]+\.[0-9]+)/,
        /(PhantomJS)\/([0-9]+\.[0-9]+)/,
        [/(Android).*Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
            return [m[1], m[3], m[2]].join(' ')
        }],
        [/(iPhone).*Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
            return [m[1], m[3], m[2]].join(' ')
        }],
        [/(iPad).*Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
            return [m[1], m[3], m[2]].join(' ')
        }],
        [/Version\/([0-9]+\.[0-9]+).*(Safari)/, function(m){
            return [m[2], m[1]].join(' ')
        }]
    ]
    for (var i = 0; i < regexs.length; i++){
        var regex = regexs[i]
        var pick = function(m){
            return m.slice(1).join(' ')
        }
        if (regex instanceof Array){
            pick = regex[1]
            regex = regex[0]
        }
        var match = userAgent.match(regex)
        if (match){
            return pick(match)
        }
    }
    return userAgent
})()

var socket, runnerFrame, statusElm
window.onload = function(){
    statusElm = document.getElementById('status')
    socket = io.connect()
    runnerFrame = document.getElementById('runner')
    runnerFrame.src = 'about:blank'
    socket.on('connect', function(){
        statusElm.innerHTML = 'Connected'
        statusElm.className = 'connected'
        socket.emit('browser-login', browserName)
    })
    socket.on('disconnect', function(){
        statusElm.innerHTML = 'Disconnected'
        statusElm.className = 'disconnected'
        runnerFrame.src = 'about:blank'
    })
    socket.on('start-tests', function(data){
        runnerFrame.setAttribute('src', '/runner/#testem')
    })
    console.log('TESTEM: done with setup')
}
