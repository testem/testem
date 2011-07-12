var Net = require('net'),
    log = console.log



function SocketIOClient(host, port, uri){
    this.host = host
    this.port = port
    this.key = '80448496165541843'
    this.uri = '/socket.io/1/websocket/' + this.key
    this.cbs = {
        message: [],
        disconnect: [],
        connect: []
    }
    this.lastMsg = ''
    this.state = 'init'
    this.headers = {}
}
SocketIOClient.prototype = {
    frame: '~m~',
    genWebSocketKey: function genWebSocketKey(){
        function randn(n){
            return Math.floor(Math.random() * n)
        }
        var chars = '%{}~.*abcdefghijklmnopqrstvwxyz!@#$%^&*()'
        var spaces = 1 + randn(11),
            max = randn(4294967296) / spaces,
            number = randn(max + 1),
            product = number * spaces,
            key = String(product).split(''),
            numchars = randn(11) + 1
        for (var i = 0; i < numchars; i++)
            key.splice(randn(key.length),0,chars[randn(chars.length)])
        for (var i = 0; i < spaces; i++)
            key.splice(1 + randn(key.length - 2),0,' ')
        return key.join('')
    },
    genRandomKey: function genRandomKey(len){
        var chars = '0123456789%{}~.*abcdefghijklmnopqrstvwxyz!@#$%^&*()'
        var ret = ''
        for (var i = 0; i < len; i++)
            ret += chars[Math.floor((Math.random() * chars.length))]
        return ret
    },
    onData: function(data){
        data = String(data)
        log('data\n' + data)
        if (this.state === 'init'){
            var lines = data.split(/\r\n|\r|\n/)
            for (var i = 0; i < lines.length; i++){
                var line = lines[i]
                if (line === ''){
                    this.state = 'init2'
                    continue
                }else if (this.state === 'init'){
                    var idx = line.indexOf(':')
                    if (idx != -1)
                        this.headers[line.substring(0, idx)] = 
                            line.substring(idx + 1).trim()
                }else{
                    // this line is return key
                    this.lastMsg = line
                }
            }
            log(this.headers)
        }
        else if (this.state === 'init2'){
            // rest of reply key
            var returnKey = this.lastMsg + data
            if (!this.verifyReturnKey(returnKey)){
                this.socket.destroy()
                throw new Error('Invalid return key from server.')
            }
            this.state = 'connected'
        }else if (this.state === 'connected'){
            var msgs = String(this.lastMsg + data).split('\ufffd')
            this.lastMsg = msgs.pop()
            msgs.forEach(function(line){
                if (line[0] == '\u0000')
                    line = line.substr(1)
                line = this.decode(line).join('')

                if (line.substr(0, 3) === '2::'){
                    log('Heartbeat!')
                    this.send({type: 'heartbeat'})
                }
                else if (line.trim().length > 0){
                    this.cbs.message.forEach(function(cb){
                        cb(line)
                    })
                }
            }, this)
        }
    },
    stringify: function(message){
    	if (Object.prototype.toString.call(message) == '[object Object]'){
    		return '~j~' + JSON.stringify(message);
    	} else {
    		return String(message);
    	}
    },
    verifyReturnKey: function(){
        return true
    },
    onEnd: function(){
        this.cbs.disconnect.forEach(function(cb){ cb() })
        log('disconnected')
    },
    connect: function(){
        this.socket = new Net.Socket()
        var key1 = this.genWebSocketKey()
        var key2 = this.genWebSocketKey()
        var key3 = this.genRandomKey(8)
        var host = this.host + ':' + this.port
        var initData = [
            'GET ' + this.uri + ' HTTP/1.1',
            'Upgrade: WebSocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Key1: ' + key1,
            'Sec-WebSocket-Key2: ' + key2,
            'Host: ' + host,
            'Origin: ' + host,
            '',
            key3].join('\n')
        this.socket.connect(this.port, this.host)
        this.socket.on('data', this.onData.bind(this))
        this.socket.on('end', this.onEnd.bind(this))
        this.socket.write(initData)
    },
    encode: function(messages){
    	var ret = '', message,
    			messages = messages instanceof Array ? messages : [messages];
    	for (var i = 0, l = messages.length; i < l; i++){
    		message = messages[i] === null || messages[i] === undefined ? '' : this.stringify(messages[i]);
    		ret += this.frame + message.length + this.frame + message;
    	}
    	return '\u0000' + ret + '\ufffd';
    },
    decode: function(data){
    	var messages = [], number, n;
    	do {
    		if (data.substr(0, 3) !== this.frame) return messages;
    		data = data.substr(3);
    		number = '', n = '';
    		for (var i = 0, l = data.length; i < l; i++){
    			n = Number(data.substr(i, 1));
    			if (data.substr(i, 1) == n){
    				number += n;
    			} else {	
    				data = data.substr(number.length + this.frame.length);
    				number = Number(number);
    				break;
    			} 
    		}
    		messages.push(data.substr(0, number)); // here
    		data = data.substr(number);
    	} while(data !== '');
    	return messages;
    },
    send: function(data){
        this.socket.write(this.encode(data))
    },
    emit: function(type){
        var args = Array.prototype.slice.call(arguments, 1)
        this.send({name: type, args: args})
    },
    on: function(type, cb){
        if (type in this.cbs)
            this.cbs[type].push(cb)
        else
            throw new Error([
                "Unknown event type '",
                type,
                ",."])
    }
}

exports.SocketIOClient = SocketIOClient
