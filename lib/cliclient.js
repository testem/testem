var Guid = require('guid')

var mkdirp = require('mkdirp').mkdirp

ClientMethods = {
    init: function(){
        this.on('login', function(data){
            this.onLogin(JSON.parse(data))
        }.bind(this))
        this.on('new', this.onNew)
        this.on('upload', this.onUpload)
        this.on('config', function(data){
            this.onConfig(JSON.parse(data))
        }.bind(this))
    },
    onNew: function(){
        this.appID = String(Guid.create())
        this.createAppDir()
    },
    onConfig: function(testConfig){
        this.testConfig = testConfig
    },
    onUpload: function(data){
        
    },
    createAppDir: function(){
        mkdirp(this.appDir, 0755, function(err){
            this.emit('new', 'ok')
        }.bind(this))
    },
    filePath: function(path){
        
    }
}

ClientProperties = {
    appDir: {
        get: function(){
            return [this.config.basedir, this.appID].join('/')
        }
    },
    type: {
        get: function(){
            return 'runner'
        }
    }
}

exports.extend = function(client, config){
    for (var meth in ClientMethods)
        client[meth] = ClientMethods[meth]
    for (var prop in ClientProperties)
        Object.defineProperty(client, prop, ClientProperties[prop])
    client.config = config
}