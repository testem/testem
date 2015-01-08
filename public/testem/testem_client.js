/*

testem_client.js
================

The client-side script that reports results back to the Testem server via Socket.IO.
It also restarts the tests by refreshing the page when instructed by the server to do so.

*/


function getBrowserName(userAgent){
  var regexs = [
    /MS(?:(IE) (1?[0-9]\.[0-9]))/,
    [/(OPR)\/([0-9]+\.[0-9]+)/, function(m){
      return ['Opera', m[2]].join(' ')
    }],
    /(Opera).*Version\/([0-9]+\.[0-9]+)/,
    /(Chrome)\/([0-9]+\.[0-9]+)/,
    /(Firefox)\/([0-9a-z]+\.[0-9a-z]+)/,
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
  socket.disconnect()
  window.location.reload()
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
  if (typeof getJasmineRequireObj === 'function'){
    jasmine2Adapter(socket)
  }else if (typeof jasmine === 'object'){
    jasmineAdapter(socket)
  }else if ((typeof mocha).match(/function|object/)){
    mochaAdapter(socket)
  }else if (typeof QUnit === 'object'){
    qunitAdapter(socket)
  }else if (typeof buster !== 'undefined'){
    busterAdapter(socket)
  }
}

var addListener = window.addEventListener ?
  function(obj, evt, cb){ obj.addEventListener(evt, cb, false) } :
  function(obj, evt, cb){ obj.attachEvent('on' + evt, cb) }

function getId(){
  var m = location.pathname.match(/^\/([0-9]+)/)
  return m ? m[1] : null
}

function init(){
  takeOverConsole()
  interceptWindowOnError()
  socket = io.connect({ reconnectionDelayMax: 1000 })
  var id = getId()
  socket.emit('browser-login',
    getBrowserName(navigator.userAgent),
    id)
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
  setupTestStats()
}

function setupTestStats(){
  var originalTitle = document.title
  var total = 0
  var passed = 0
  Testem.on('test-result', function(test){
    total++
    if (test.failed === 0) passed++
    updateTitle()
  })

  function updateTitle(){
    if (!total) return
    document.title = originalTitle + ' (' + passed + '/' + total + ')'
  }
}

function takeOverConsole(){
  var console = window.console
  if (!console) {
    console = window.console = {
      log: function () {},
      warn: function () {},
      error: function () {},
      info: function () {}
    }
  }
  function intercept(method){
    var original = console[method]
    console[method] = function(){
      var args = Array.prototype.slice.apply(arguments)
      var message = decycle(args).join(' ')
      var doDefault = Testem.handleConsoleMessage(message)
      if (doDefault !== false){
        socket.emit(method, decycle(message))
        if (original && original.apply){
          // Do this for normal browsers
          original.apply(console, arguments)
        }else if (original) {
          // Do this for IE
          original(message)
        }
      }
    }
  }
  var methods = ['log', 'warn', 'error', 'info']
  for (var i = 0; i < methods.length; i++)
    intercept(methods[i])
}

function interceptWindowOnError(){
  window.onerror = function(msg, url, line){
    if (typeof msg === 'string' && typeof url === 'string' && typeof line === 'number'){
      socket.emit('top-level-error', msg, url, line)
    }
  }
}

function emit(){
  Testem.emit.apply(Testem, arguments)
}

window.Testem = {
  useCustomAdapter: function(adapter){
    adapter(socket)
  },
  emit: function(evt){
    var args = Array.prototype.slice.apply(arguments)
    var argsWithoutFirst = Array.prototype.slice.call(arguments, 1)
    var self = this;
    // Workaround IE 8 max instructions
    setTimeout(function() {
      var decycled = decycle(args);
      setTimeout(function() {
        socket.emit.apply(socket, decycled);
        if (self.evtHandlers && self.evtHandlers[evt]){
          var handlers = self.evtHandlers[evt]
          for (var i = 0; i < handlers.length; i++){
            var handler = handlers[i]
            handler.apply(self, argsWithoutFirst)
          }
        }
      }, 0);
    }, 0);
  },
  on: function(evt, callback){
    if (!this.evtHandlers){
      this.evtHandlers = {}
    }
    if (!this.evtHandlers[evt]){
      this.evtHandlers[evt] = []
    }
    this.evtHandlers[evt].push(callback)
  },
  handleConsoleMessage: function(){}
}

init()
