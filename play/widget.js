var nc=require('ncurses'), widgets=require('ncurses/lib/widgets'),
    path=require('path');
var exampleList = Object.keys(widgets).concat(['FileViewer']), which;

if (process.argv.length !== 3 || exampleList.indexOf(process.argv[2]) === -1) {
  console.log('Usage: node ' + path.basename(process.argv[1])
              + ' <' + exampleList.join('|') + '>');
  return;
}

var win = new nc.Window();
nc.showCursor = false;

switch (process.argv[2]) {
  case 'MessageBox':
    widgets.MessageBox('This is a really cool prompt!',
      {
        buttons: ['OK', 'Cancel'],
        pos: 'bottom',
        style: {
          colors: {
            bg: 'blue',
            button: {
              bg: 'green',
              fg: 'black'
            }
          }
        }
      }, function(choice) {
        if (!choice)
          choice = 'nothing';
        win.centertext(0, 'You selected ' + choice);
        win.refresh();
        setTimeout(function() { win.close(); }, 1000);
    });
  break;
  case 'InputBox':
    widgets.InputBox('Enter your name:',
      {
        pos: 'center',
        style: {
          colors: {
            bg: 'blue',
            input: {
              fg: 'red',
              bg: 'black'
            }
          }
        }
      }, function(input) {
        if (!input)
          input = 'nothing';
        win.centertext(0, 'You entered: ' + input);
        win.refresh();
        setTimeout(function() { win.close(); }, 1000);
    });
  break;
  case 'Calendar':
    widgets.Calendar(
      {
        title: 'My Calendar',
        style: {
          colors: {
            bg: 'blue',
            today: {
              fg: 'white',
              bg: 'red'
            }
          }
      }}, function(seldate) {
        if (!seldate)
          seldate = 'nothing';
        win.centertext(0, 'You entered: ' + seldate);
        win.refresh();
        setTimeout(function() { win.close(); }, 1000);
    });
  break;
  case 'Viewer':
    function randomText(length) {
      var ret = '';
      if (typeof length === 'undefined')
        length = Math.floor(Math.random()*300)+1;
      for (var i=0; i<length; i++)
        ret += String.fromCharCode(Math.floor(Math.random()*93)+33);
      return ret;
    }
    var text = 'Line 1 ' + randomText();
    for (var i=2; i<=100; i++)
      text += '\nLine ' + i + ' ' + randomText();

    widgets.Viewer(text,
      {
        title: 'My Viewer',
        width: nc.cols-3,
        height: nc.lines-3,
        linecount: true,
        style: {
          colors: {
            bg: 'blue'
          }
        }
      }, function() {
        win.centertext(0, 'Done!');
        win.refresh();
        setTimeout(function() { win.close(); }, 1000);
    });
  break;
  case 'ListBox':
    var items = [];
    for (var i=0; i<9; i++)
      items.push('Item ' + (i+1));
    widgets.ListBox(items,
      {
        title: 'My ListBox',
        height: 5,
        multi: true,
        style: {
          colors: {
            bg: 'blue',
            sel: {
              fg: 'red'
            }
          }
        }
      }, function(selection) {
        if (!selection)
          selection = 'nothing';
        else if (Array.isArray(selection)) {
          selection = selection.join(', ');
        }
        win.centertext(0, 'You selected: ' + selection);
        win.refresh();
        setTimeout(function() { win.close(); }, 1000);
    });
  break;
  case 'Marquee':
    var scroller = new widgets.Marquee("Node.JS rules!",
      {
        delay: 90, // ms
        dir: 'left',
        pos: 'top',
        style: {
          bold: true,
          underline: false,
          colors: {
            bg: 'blue',
            fg: 'white'
          }
        }
      }
    );
    setTimeout(function() { scroller.stop(); win.close(); }, 10000);
  break;
  case 'FileViewer': // (ListBox + Viewer)
    var fs=require('fs'), path=require('path');
    function sortFn(a, b) {
      if (a[0] > b[0])
        return 1;
      else if (a[0] < b[0])
        return -1;
      else
        return 0;
    }
    function selectFile(cb, dir) {
      var chooser;
      if (typeof dir === 'undefined')
        dir = __dirname;
      if (!dir.length || dir[dir.length-1] !== '/')
        dir += '/';
      fs.readdir(dir, function(err, entries) {
        if (err) {
          cb(err);
          return;
        }
        var files = [], dirs = [];
        for (var i=0,len=entries.length; i<len; i++) {
          try {
            var st = fs.statSync(path.normalize(dir + entries[i]));
            if (st.isDirectory())
              dirs.push([entries[i], {fg: 'yellow'}]);
            else
              files.push([entries[i], {fg: 'green'}]);
          } catch(e) {
            cb(e);
            return;
          }
        }
        dirs.sort(sortFn);
        files.sort(sortFn);
        if (dir !== '/' && dir !== '')
          dirs.unshift(['..', {fg: 'yellow'}]);
        chooser = widgets.ListBox(dirs.concat(files), {
          title: 'Choose a file',
          height: nc.lines-6,
          width: nc.cols-6
        }, function(file) {
          var isdir = false, dest = path.normalize(dir + file);
          if (!dest.length)
            dest = '/';
          try {
            var st = fs.statSync(dest);
            isdir = st.isDirectory();
          } catch(e) {
            cb(e);
            return;
          }
          if (isdir) {
            process.nextTick(function(){selectFile(cb, dest)});
            return;
          }
          cb(undefined, dir + file);
        });
      });
    }
    function error(msg) {
      win.centertext(0, 'Error: ' + msg);
      win.refresh();
      setTimeout(function() { win.close(); }, 3000);
    }
    selectFile(function(err, filename) {
      if (err) {
        error(err);
        return;
      }
      fs.readFile(filename, 'ascii', function(err, contents) {
        if (err) {
          error(err);
          return;
        }
        widgets.Viewer(contents,
          {
            title: path.basename(filename),
            width: nc.cols-2,
            height: nc.lines-2
          }, function() {
            win.close();
        });
      });
    });
  break;
}