# browser-launcher

Detect the browser versions available on your system and launch them in an
isolated profile for automated testing purposes.

You can launch browsers headlessly (if you have Xvfb or with phantom) and set
the proxy configuration on the fly.

# example

``` js
var launcher = require('launcher');
launcher(function (err, launch) {
    if (err) return console.error(err);
    
    console.log('# available browsers:');
    console.dir(launch.browsers);
    
    var opts = {
        headless : true,
        browser : 'chrome',
        proxy : 'localhost:7077',
    };
    launch('http://substack.net', opts, function (err, ps) {
        if (err) return console.error(err);
    });
});
```

***

```
$ node example/launch.js 
# available browsers:
{ local: 
   [ { name: 'chrome',
       re: {},
       type: 'chrome',
       profile: '/home/substack/.config/browser-launcher/chrome-17.0.963.12_9c0bdd8d',
       command: 'google-chrome',
       version: '17.0.963.12' },
     { name: 'chromium',
       re: {},
       type: 'chrome',
       profile: '/home/substack/.config/browser-launcher/chromium-18.0.1025.168_e025d855',
       command: 'chromium-browser',
       version: '18.0.1025.168' },
     { name: 'phantom',
       re: {},
       type: 'phantom',
       headless: true,
       profile: '/home/substack/.config/browser-launcher/phantom-1.4.0_31767fa2',
       command: 'phantomjs',
       version: '1.4.0' },
     { name: 'firefox',
       re: {},
       type: 'firefox',
       profile: [Object],
       command: 'firefox',
       version: '12.0' } ] }
```

# methods

``` js
var launcher = require('launcher')
```

## launcher(cb)

Create a new launcher function in `cb(err, launch)`, scanning for system
browsers if no `~/.config/browser-launcher/config.json` is present and reading
from that file otherwise.

## launch(uri, opts, cb)

Launch a new instance of `opts.browser` with the optional version constraint
`opts.version`. Without an `opts.version`, the highest version of `opts.browser`
is used.

To launch the browser headlessly (if it isn't already headless like phantom),
set `opts.headless`. This launches the browser with
[node-headless](https://github.com/kesla/node-headless/)
which uses the `Xvfb` command to create a fake X server.

To use the browser with a proxy, set `opts.proxy` as a colon-separated
`'host:port'` string.

Set proxy routes to skip over with `opts.noProxy`.

`cb` fires with `cb(err, ps)` where `ps` is the process object created with
`spawn()`.

## launch.browsers

This property shows what browsers are configured to be launchable, divided into
groups. The default group is `'local'`.

# install

```
npm install browser-launcher
```

# license

MIT
