/*

testem_client.js
================

The client-side script that reports results back to the Testem server via Socket.IO.
It also restarts the tests by refreshing the page when instructed by the server to do so.

*/

function getBrowserName(userAgent){
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
}

var socket, connectStatus = 'disconnected'

function syncConnectStatus(){
    var elm = document.getElementById('__testem_ui__')
    if (elm) elm.className = connectStatus
}

function startTests(){
    window.location = '/'
}

function initUI(){
    var markup = '\
    <style>\
    #__testem_ui__{\
        position: fixed;\
        bottom: 5px;\
        right: 5px;\
        background-color: #444;\
        padding: 3px;\
        color: #fff;\
        font-family: Monaco, monospace;\
        text-transform: uppercase;\
        opacity: 0.8;\
    }\
    #__testem_ui__.connected{\
        color: #89e583;\
    }\
    #__testem_ui__.disconnected{\
        color: #cc7575;\
    }\
    </style>\
    TEST\u0027EM \u0027SCRIPTS!\
    '
    var elm = document.createElement('div')
    elm.id = '__testem_ui__'
    elm.className = connectStatus
    elm.innerHTML = markup
    document.body.appendChild(elm)
    
}

function initTestFrameworkHooks(){
    if (typeof jasmine === 'object'){
        jasmineAdapter(socket)
    }else if (typeof mocha === 'function'){
        mochaAdapter(socket)
    }else if (typeof QUnit === 'object'){
        qunitAdapter(socket)
    }
}

var addListener = window.addEventListener ?
    function(obj, evt, cb){
        obj.addEventListener(evt, cb, false)
    } :
    function(obj, evt, cb){
        obj.attachEvent('on' + evt, cb)
    }

function init(){
    socket = io.connect()
    socket.emit('browser-login', getBrowserName(navigator.userAgent))
    socket.on('connect', function(){
        connectStatus = 'connected'
        syncConnectStatus()
    })
    socket.on('disconnect', function(){
        connectStatus = 'disconnected'
        syncConnectStatus()
    })
    socket.on('reconnect', startTests)
    socket.on('start-tests', startTests)
    initTestFrameworkHooks()
    addListener(window, 'load', initUI)
}

init()
