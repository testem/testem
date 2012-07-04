var EventEmitter = require('events').EventEmitter;
var json = typeof JSON === 'object' ? JSON : require('jsonify');
var proto = require('dnode-protocol');
var bus = require('postmessage');

module.exports = function (opts, vars, cb) {
    if (typeof opts === 'string') {
        opts = { uri : opts };
    }
    if (typeof cb === 'object') {
        var cb_ = cb;
        cb = vars;
        vars = cb_;
    }
    if (!vars) vars = {};
    
    var w = new Driver(opts, vars);
    if (typeof cb === 'function') w.next(cb);
    return w;
};

function Driver (opts, vars) {
    var self = this;
    self.vars = vars;
    self.element = document.createElement('iframe');
    var queue = self.queue = { next : [], remote : [] };
    
    self.client = proto(function (remote, conn) {
        conn.on('ready', function () {
            if (queue.next.length) {
                var cb = queue.next.shift();
                remote.run(String(cb), vars);
            }
            else queue.remote.push(remote);
        });
    });
    bindListeners(self);
    
    var u = opts.uri || opts.url;
    if (u) self.navigate(u);
}

Driver.prototype = new EventEmitter;

Driver.prototype.appendTo = function (elem) {
    return elem.appendChild(this.element);
};

Driver.prototype.navigate = function (uri, cb) {
    this.element.setAttribute('src', uri);
    if (typeof cb === 'function') {
        // like .next() but skip the queue
        this.once('open', function () {
            
        });
    }
};
 
Driver.prototype.next = function (cb) {
    var q = this.queue;
    if (q.remote.length) {
        q.remote.shift().run(String(cb), this.vars);
    }
    else q.next.push(cb);
    return this;
};

function bindListeners (self) {
    var session, win;
    
    bus.receiveMessage(function (ev) {
        try {
            var msg = json.parse(ev.data)
            if (msg[0] === '__testling_open') {
                session = create(self.element.contentWindow);
                self.emit('open', msg[1]);
            }
            else if (session && msg[0] === '__testling_message') {
                session.handle(msg[1]);
            }
        }
        catch (err) {}
    });
    
    function create (win) {
        var c = self.client.create();
        
        c.on('request', function (req) {
            bus.postMessage(
                json.stringify([ '__testling_message', req ]),
                '*',
                win
            );
        });
        
        c.start();
        return c;
    }
};
