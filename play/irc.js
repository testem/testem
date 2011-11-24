/* Press ESC to bring up a window list to switch between windows */

var nc = require('ncurses'),
    irc = require('irc'),
    widgets = require('ncurses/lib/widgets');
var connections = [], config = {
  userName: 'nodecurses',
  realName: 'node-ncurses IRC client',
  port: 6667,
  autoRejoin: true,
  secure: false
}, clientInfo = {
  name: 'nnirc',
  version: '1.0',
  env: ''
};
var CTCP_DELIM = String.fromCharCode(1);

function getWinName(win, conn) {
  var key = '', isChannel = false;
  for (var i=0,chans=Object.keys(conn.wins.channels); i<chans.length; i++) {
    if (win === conn.wins.channels[chans[i]]) {
      key = chans[i];
      isChannel = true;
      break;
    }
  }
  if (!isChannel) {
    for (var i=0,queries=Object.keys(conn.wins.queries); i<queries.length; i++) {
      if (win === conn.wins.queries[queries[i]]) {
        key = queries[i];
        break;
      }
    }
  }
  return key;
}

function getTimestamp() {
	var time = new Date();
	var hours = time.getHours();
	var mins = time.getMinutes();
	return "" + (hours < 10 ? "0" : "") + hours + ":" + (mins < 10 ? "0" : "") + mins;
}

function updateHeader(win, header, style) {
	var curx = win.curx, cury = win.cury;
	style = style || {};
	header = '' + header;
	win.cursor(0, 0);
	win.clrtoeol();
	if (style.attrs)
	  win.attron(style.attrs);
	if (header.length > 0) {
	  if (style.pos === 'center')
	    win.centertext(0, header);
	  else if (style.pos === 'right')
	    win.addstr(0, win.width-(Math.min(header.length, win.width)), header, win.width);
	  else
  		win.addstr(header, win.width);
  }
	if (style.attrs)
	  win.attroff(style.attrs);
	win.cursor(cury, curx);
	win.refresh();
}

function appendLine(win, message, attrs) {
	var curx = win.curx, cury = win.cury, time = getTimestamp();
	win.scroll(1);
	win.cursor(win.height-3, 0);
	win.print("[" + time + "] ");
	if (attrs)
	  win.attron(attrs);
	win.print(message);
	if (attrs)
	  win.attroff(attrs);
	win.cursor(cury, curx);
	win.refresh();
}

function cleanup() {
  nc.cleanup();
	process.exit(0);
}

// ============================================================================
function setupWindow(win, conn) {
  win.on('inputChar', function (c, i) {
    if (i === nc.keys.ESC) {
      var items = {};
      for (var i=0; i<connections.length; i++) {
        items[connections[i].client.opt.server] = connections[i].wins.status;
        for (var j=0,chans=Object.keys(connections[i].wins.channels); j<chans.length; j++)
          items['  ' + chans[j]] = connections[i].wins.channels[chans[j]];
        for (var j=0,queries=Object.keys(connections[i].wins.queries); j<queries.length; j++)
          items['  Q:' + queries[j]] = connections[i].wins.queries[queries[j]];
      }
      widgets.ListBox(items,
        {
          title: 'Windows',
          height: Math.min(Object.keys(items).length+2, nc.lines-2),
          style: {
            colors: {
              bg: 'blue',
              fg: 'white'
            }
          }
        }, function(window) {
          if (window)
            window.top();
          nc.redraw();
      });
	  } else if (i === nc.keys.BACKSPACE && win.curx > 0) {
      var prev_x = win.curx-1;
      win.delch(win.height-1, prev_x);
      win.inbuffer = win.inbuffer.substring(0, prev_x) + win.inbuffer.substring(prev_x+1);
      win.cursor(win.height-1, prev_x);
      win.refresh();
    } else if (i === nc.keys.DEL) {
      var prev_x = win.curx;
      win.delch(win.height-1, win.curx);
      win.inbuffer = win.inbuffer.substring(0, win.curx-1) + win.inbuffer.substring(win.curx);
      win.cursor(win.height-1, prev_x);
      win.refresh();
    } else if (i === nc.keys.LEFT && win.curx > 0) {
      win.cursor(win.height-1, win.curx-1);
      win.refresh();
    } else if (i === nc.keys.RIGHT && win.curx < win.inbuffer.length) {
      win.cursor(win.height-1, win.curx+1);
      win.refresh();
    } else if (i === nc.keys.END) {
      win.cursor(win.height-1, win.inbuffer.length);
      win.refresh();
    } else if (i === nc.keys.HOME) {
      win.cursor(win.height-1, 0);
      win.refresh();
	  } else if (i === nc.keys.NEWLINE) {
	    if (win.inbuffer.length) {
	      if (win.inbuffer[0] === '/') {
  	      var cmd = win.inbuffer.substring(1).split(' ', 1).join('').trim(),
  	          args = win.inbuffer.substring(win.inbuffer.indexOf(cmd)+cmd.length+1).trim();
	        switch (cmd.toLowerCase()) {
            case 'j':
	          case 'join':
              if (args.length) {
                if (args[0] !== '#' && args[0] !== '&'
                    && args[0] !== '+' && args[0] !== '!')
                  args = "#" + args;
                if (args.length > 1 && !conn.wins.channels[args])
                  conn.client.join(args);
              }
	          break;
            case 'part':
              var name = getWinName(win, conn);
              if (name[0] === '#' || name[0] === '&'
                  || name[0] === '+' || name[0] === '!') {
                conn.client.part(name);
                delete conn.wins.channels[name];
              }
            break;
	          case 'msg':
	            var who = args.substring(0, args.indexOf(' ')),
	                message = args.substring(args.indexOf(' ')+1);
	            if (!who.length || !message.length)
	              appendLine(win, 'Invalid arguments');
	            else {
	              conn.client.say(who, message);
	              appendLine(win, '* ->' + who + ': ' + message);
	            }
	          break;
	          case 'me':
	            if (win !== conn.wins.status) {
	              if (args.length) {
                  var key = getWinName(win, conn);
	                conn.client.say(key, CTCP_DELIM + 'ACTION ' + args + CTCP_DELIM);
  	              appendLine(win, '* ' + conn.client.nick + ' ' + args, COLOR_ACTION);
  	            }
	            } else
	              appendLine(win, 'That command is only valid on channel and query windows');
	          break;
            case 'whois':
              if (args.length) {
                conn.client.send('WHOIS', args, false);
              }
            break;
            case 'nick':
              if (args.length) {
                var newnick = args.split(' ', 1).join('');
                if (newnick) {
                  conn.client.prevnick = conn.client.nick;
                  conn.client.send("NICK", newnick);
                  conn.client.nick = newnick;
                }
              }
            break;
            case 'away':
              conn.client.send('AWAY', (args.length ? args : 'I am away'));
              appendLine(conn.wins.status, '* You have been marked as being away', nc.attrs.BOLD);
            break;
            case 'back':
              conn.client.send('AWAY');
              appendLine(conn.wins.status, '* You are no longer marked as being away', nc.attrs.BOLD);
            break;
            case 'exit':
	          case 'quit':
	            if (args.length)
  	            conn.client.disconnect(args);
  	          else
  	            conn.client.disconnect();
	            cleanup();
	          break;
	          case 'close':
	            if (win === conn.wins.status)
	              conn.client.disconnect();
	            else {
                var key = getWinName(win, conn);
                if (key[0] === '#' || key[0] === '&'
                    || key[0] === '+' || key[0] === '!') {
                  conn.client.part(key);
                  delete conn.wins.channels[key];
                } else
                  delete conn.wins.queries[key];
	            }
              win.close();
              nc.redraw();
              if (nc.numwins === 1)
                cleanup();
              return;
	          break;
	          case 'query':
	            var to = args.split(' ', 1).join('');
              if (!conn.wins.queries[to.toLowerCase()]) {
                var query = new nc.Window(nc.lines, nc.cols);
                setupWindow(query, conn);
                updateHeader(query, 'Query: ' + to, {pos: 'center'});
                conn.wins.queries[to.toLowerCase()] = query;
              }
	          break;
            case 'connect':
            break;
            case 'server':
            break;
            case 'whowas':
            break;
            case 'who':
            break;
            case 'info':
            break;
            case 'banlist':
            break;
            case 'notice':
            break;
            case 'invite':
            break;
            case 'ctcp':
            break;
	          default:
  	          appendLine(win, 'Unknown command: ' + cmd);
	        }
	      } else if (win.inbuffer.length && win !== conn.wins.status) {
          var key = getWinName(win, conn);
	        conn.client.say(key, win.inbuffer);
	        appendLine(win, '<' + conn.client.nick + '> ' + win.inbuffer);
	      }
	      win.inbuffer = "";
	      win.cursor(win.height-1, 0);
	      win.clrtoeol();
	      win.refresh();
	    }
	  } else if (i >= 32 && i <= 126 && win.curx < win.width-1) {
	    win.echochar(i);
	    win.inbuffer += c;
	  }
  });
  win.scrollok(true);
  win.hline(win.height-2, 0, win.width);
  win.setscrreg(1, win.height-3); // Leave one line at the top for the header
  win.cursor(win.height-1, 0);
  win.refresh();
  win.inbuffer = "";
}
function addConnection(server, nick, clientcfg) {
  var client = new irc.Client(server, nick, clientcfg),
      conn = {
        client: client,
        wins: {
          status: new nc.Window(nc.lines, nc.cols),
          channels: {},
          queries: {}
        }
      };
  client.on('connect', function() {
    appendLine(conn.wins.status, 'Connected!');
    for (var i=0,chans=Object.keys(conn.wins.channels); i<chans.length; i++)
      appendLine(conn.wins.channels[chans[i]], 'Connected!');
  });
  client.on('ready', function() {
    appendLine(conn.wins.status, 'Ready!');
  });
  client.on('error', function(err) {
    appendLine(conn.wins.status, '* Error: ' + require('sys').inspect(err));
  });
  client.conn.on('end', function() {
    appendLine(conn.wins.status, 'Disconnected!');
  });
  client.on('message', function(from, to, message) {
    var msg;
    if (to[0] === '#' || to[0] === '&'
        || to[0] === '+' || to[0] === '!') {
      if (message.substr(0, 7) === CTCP_DELIM + 'ACTION') {
        msg = '* ' + from + ' ' + message.substring(8, message.length-1);
        appendLine(conn.wins.channels[to.toLowerCase()], msg, COLOR_ACTION);
      } else {
        msg = '<' + from + '> ' + message;
        appendLine(conn.wins.channels[to.toLowerCase()], msg);
      }
    } else {
      if (message[0] === CTCP_DELIM && message[message.length-1] === CTCP_DELIM) {
        message = message.substring(1, message.length-1);
        var which = message.split(' ', 1).join('').toLowerCase();
        switch (which) {
          case 'action':
            if (!conn.wins.queries[from.toLowerCase()]) {
              var query = new nc.Window(nc.lines, nc.cols);
              setupWindow(query, conn);
              updateHeader(query, 'Query: ' + from, {pos: 'center'});
              conn.wins.queries[from.toLowerCase()] = query;
            }
            msg = '* ' + from + ' ' + message.substring(8, message.length-1);
            appendLine(conn.wins.queries[from.toLowerCase()], msg, COLOR_ACTION);
          break;
          case 'version':
            client.send('NOTICE', from, CTCP_DELIM + "VERSION"
                                        + " " + clientInfo.name
                                        + " " + clientInfo.version
                                        + " " + clientInfo.env + CTCP_DELIM);
          break;
          case 'time':
            var curTime = new Date(), dow = curTime.getDay(),
                day = curTime.getDate(), month = curTime.getMonth(),
                year = curTime.getFullYear(), hours = curTime.getHours(),
                mins = curTime.getMinutes(), secs = curTime.getSeconds(),
                tz = curTime.toString().replace(/^.*\(([^)]+)\)$/, '$1'),
                months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                daysofweek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            var strTime = daysofweek.slice(dow, (dow == 6 ? dow : dow+1)).toString()
                + " " + months.slice(month, (month == 11 ? month : month+1)).toString()
                + " " + (day < 10 ? "0" : "") + day
                + " " + (hours < 10 ? "0" : "") + hours
                + ":" + (mins < 10 ? "0" : "") + mins
                + ":" + (secs < 10 ? "0" : "") + secs
                + " " + year + " " + tz.toUpperCase();
            msg = CTCP_DELIM + "TIME " + strTime + CTCP_DELIM;
            client.send('NOTICE', from, msg);
          break;
        }
      } else {
        if (!conn.wins.queries[from.toLowerCase()]) {
          var query = new nc.Window(nc.lines, nc.cols);
          setupWindow(query, conn);
          updateHeader(query, 'Query: ' + from, {pos: 'center'});
          conn.wins.queries[from.toLowerCase()] = query;
        }
        appendLine(conn.wins.queries[from.toLowerCase()], '<' + from + '> ' + message);
      }
    }
  });
  client.on('kick', function(channel, nick, by, reason) {
    var msg = nick + ' has been kicked by ' + by + (reason ? ' (' + reason + ')' : '');
    appendLine(conn.wins.channels[channel.toLowerCase()], msg, nc.attrs.BOLD);
  });
  client.on('join', function(channel, nick) {
    var msg;
    if (nick === client.nick) {
      conn.wins.channels[channel.toLowerCase()] = new nc.Window(nc.lines, nc.cols);
      setupWindow(conn.wins.channels[channel.toLowerCase()], conn);
      msg = '* Now talking on ' + channel;
      appendLine(conn.wins.channels[channel.toLowerCase()], msg);
    } else {
      msg = nick + ' has joined the channel';
      appendLine(conn.wins.channels[channel.toLowerCase()], msg, COLOR_JOIN);
    }
  });
  client.on('part', function(channel, nick, reason) {
    if (nick !== client.nick) {
      var msg = nick + ' has left the channel' + (reason ? ' (' + reason + ')' : '');
      appendLine(conn.wins.channels[channel.toLowerCase()], msg, COLOR_PART);
    }
  });
  client.on('quit', function(channel, nick, reason) {
    if (nick !== client.nick) {
      var msg = nick + ' has quit IRC' + (reason ? ' (' + reason + ')' : '');
      appendLine(conn.wins.channels[channel.toLowerCase()], msg, COLOR_QUIT);
    }
  });
  client.on('topic', function(channel, topic, nick, joining) {
    var msg;
    if (joining)
      msg = '* Topic ' + (topic ? 'set by ' + nick + ': ' + topic : 'not set');
    else
      msg = '* ' + nick + ' has ' + (topic ? 'set the topic to: ' + topic : 'removed the topic');
    appendLine(conn.wins.channels[channel.toLowerCase()], msg, nc.attrs.BOLD);
    updateHeader(conn.wins.channels[channel.toLowerCase()], topic || '', {attrs: COLOR_TOPIC});
  });
  client.on('nick', function(channel, oldnick, newnick) {
    var msg, which;
    if (newnick === client.nick)
      msg = '* You are now known as ' + newnick;
    else
      msg = '* ' + oldnick + ' is now known as ' + newnick;
    if (channel === undefined)
      which = conn.wins.status;
    else
      which = conn.wins.channels[channel.toLowerCase()];
    appendLine(which, msg, nc.attrs.BOLD);
  });
  client.on('away', function(nick, message) {
    appendLine(conn.wins.status, '* ' + nick + ' is away: ' + message);
  });
  client.on('mode', function(channel, issuer, issuee, mode) {
    var msg = '* ' + issuer + (mode[0] === '+' ? ' gives ' : ' removes ');
    if (mode[1] === 'o')
      msg += 'channel operator status';
    else if (mode[1] === 'v')
      msg += 'voice';
    else
      msg += 'unknown status';
    msg += (mode[0] === '+' ? ' to ' : ' from ') + issuee;
    appendLine(conn.wins.channels[channel.toLowerCase()], msg, nc.attrs.BOLD);
  });
  client.on('whois', function(nick, info) {
    var prefix = '[' + nick + '] ', msg;
    msg = '(' + info.username + '@' + info.host + '): ' + info.realname;
    appendLine(conn.wins.status, prefix + msg, nc.attrs.BOLD);
    if (info.channels) {
      msg = '';
      for (var i=0; i<info.channels.length; i++) {
        msg += (info.channels[i].mode ? info.channels[i].mode : '') + info.channels[i].name;
      }
      appendLine(conn.wins.status, prefix + msg, nc.attrs.BOLD);
    }
    appendLine(conn.wins.status, prefix + info.server.host + ' ' + info.server.info, nc.attrs.BOLD);
    if (info.secureConn)
      appendLine(conn.wins.status, prefix + 'is using a secure connection', nc.attrs.BOLD);
    if (info.hostinfo)
      appendLine(conn.wins.status, prefix + info.hostinfo, nc.attrs.BOLD);
    if (info.actually) {
      msg = 'is connecting from ' + info.actually.username + '@'
            + info.actually.host + ' ' + info.actually.ip;
      appendLine(conn.wins.status, prefix + msg, nc.attrs.BOLD);
    }
    if (info.idle || info.signon) {
      var msg = '';
      if (info.idle) {
        var secs = info.idle,
            hours = Math.floor(secs / 3600),
            mins = Math.floor((secs % 3600) / 60);
        secs = Math.ceil((secs % 3600) % 60);
        hours = (hours < 10 ? '0' + hours : ''+hours);
        mins = (mins < 10 ? '0' + mins : ''+mins);
        secs = (secs < 10 ? '0' + secs : ''+secs);
        msg = 'idle ' + hours + ':' + mins + ':' + secs;
      }
      if (info.signon)
        msg += (msg.length ? ', ' : '') + 'signon: ' + (new Date(info.signon*1000));
      appendLine(conn.wins.status, prefix + msg, nc.attrs.BOLD);
    }
    if (info.account)
      appendLine(conn.wins.status, prefix + 'is logged in as ' + info.account, nc.attrs.BOLD);
    appendLine(conn.wins.status, prefix + 'End of WHOIS list.', nc.attrs.BOLD);
  });
  client.on('unhandledMessage', function(message) {
    var msg = 'UNHANDLED ' + message.command + ' > prefix: ' + message.prefix
              + ', nick: ' + message.nick + ', args: ' + require('sys').inspect(message.args);
    appendLine(conn.wins.status, msg, nc.attrs.BOLD);
  });
  setupWindow(conn.wins.status, conn);
  connections.push(conn);
  updateHeader(conn.wins.status, 'Status: ' + server, {attrs: nc.attrs.BOLD});
  appendLine(conn.wins.status, 'Connecting ...');
}
var root = new nc.Window(); // unused on purpose -- it creates stdscr

// Setup colors
var COLOR_JOIN = nc.colorPair(2);
var COLOR_PART = nc.colorPair(3);
var COLOR_TOPIC = nc.colorPair(4, nc.colors.BLACK, nc.colors.WHITE);
var COLOR_ACTION = nc.colorPair(5);
var COLOR_QUIT = nc.colorPair(6);

addConnection('irc.freenode.net', 'ncursestest' + Math.ceil(Math.random()*100));