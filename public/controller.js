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

function resize(){
    $(document.body).css({overflow: 'hidden'})
    runnerFrame.css({height: ($(window).height() - runnerFrame.offset().top) + 'px'})
}

var socket, runnerFrame, statusElm,
    runnerURL = '/runner/#testem'
    
$(function(){
    statusElm = $('#status')
    socket = io.connect()
    runnerFrame = $('#runner')
    resize()
    $(window).resize(resize)
    runnerFrame.attr('src', 'about:blank')
    socket.on('connect', function(){
        statusElm
            .html('Connected')
            .attr('class', 'connected')
        socket.emit('browser-login', browserName)
    })
    socket.on('disconnect', function(){
        statusElm
            .html('Disconnected')
            .attr('class', 'disconnected')
        runnerFrame.attr('src', 'about:blank')
    })
    socket.on('start-tests', function(data){
        runnerFrame.attr('src', 'about:blank')
        setTimeout(function(){
            runnerFrame.attr('src', runnerURL)
        }, 1)
    })
    console.log('TESTEM: done with setup')
})
