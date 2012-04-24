var path = require('path')
  , rimraf = require('rimraf')
  
var tempDir = function(){
    var platform = process.platform
    if (platform === 'win32')
        return 'C:\\Windows\\Temp'
    else
        return '/tmp'
}()

var userHomeDir = process.env.HOME || process.env.USERPROFILE

function browsersForPlatform(){
    var platform = process.platform
    if (platform === 'win32'){
        return  [
            {
                name: "IE7",
                exe: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
                setup: function(app, done){
                    app.server.ieCompatMode = 'EmulateIE7'
                    done()
                }
            },
            {
                name: "IE8",
                exe: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
                setup: function(app, done){
                    app.server.ieCompatMode = 'EmulateIE8'
                    done()
                }
            },
            {
                name: "IE9",
                exe: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
                setup: function(app, done){
                    app.server.ieCompatMode = '9'
                    done()
                }
            },
            {
                name: "Firefox",
		exe: [
                    "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
                    "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe"
                ],
                args: ["-profile", tempDir + "\\testem.firefox"],
                setup: function(app, done){
                    rimraf(tempDir + '\\testem.firefox', done)
                }
            },
            {
                name: "Chrome",
                exe: [
                    userHomeDir + "\\Local Settings\\Application Data\\Google\\Chrome\\Application\\chrome.exe",
                    userHomeDir + "\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
                ],
                args: ["--user-data-dir=" + tempDir + "\\testem.chrome", "--no-default-browser-check", "--no-first-run"],
                setup: function(app, done){
                    rimraf(tempDir + '\\testem.chrome', done)
                }
            },
            {
                name: "Safari",
                exe: [
                    "C:\\Program Files\\Safari\\safari.exe",
                    "C:\\Program Files (x86)\\Safari\\safari.exe"
                ]
            },
            {
                name: "Opera",
                exe: "C:\\Program Files\\Opera\\opera.exe",
                args: ["-pd", tempDir + "\\testem.opera"],
                setup: function(app, done){
                    rimraf(tempDir + '\\testem.opera', done)
                }
            }
        ]
    }else if (platform === 'darwin'){
        return [
            {
                name: "Chrome", 
                exe: "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome", 
                args: ["--user-data-dir=" + tempDir + "/testem.chrome", "--no-default-browser-check", "--no-first-run"],
                setup: function(app, done){
                    rimraf(tempDir + '/testem.chrome', done)
                }
            },
            {
                name: "Firefox", 
                exe: "/Applications/Firefox.app/Contents/MacOS/firefox"
            },
            {
                name: "Safari",
                exe: "/Applications/Safari.app/Contents/MacOS/Safari",
                args: [path.dirname(__dirname) + '/assets/safari_start.html']
            },
            {
                name: "Opera",
                exe: "/Applications/Opera.app/Contents/MacOS/Opera",
                args: ["-pd", tempDir + "/testem.opera"],
                setup: function(app, done){
                    rimraf(tempDir + '/testem.opera', done)
                }
            }
        ]
    }else if (platform === 'linux'){
        return []
    }
}

exports.browsersForPlatform = browsersForPlatform