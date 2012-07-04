pw
==

Password prompts for node.

example
=======

pw.js

``` js
var pw = require('pw');

process.stdout.write('Password: ');
pw(function (password) {
    console.log('password=' + password);
})
```

output:

```
$ node pw.js
Password: *****
password=money
$
```

methods
=======

var pw = require('pw');

pw(sep='*', stdin=process.stdin, stdout=process.stdout, cb)
---------------

Prompt for a password on `stdin`, placing the string `sep` for each key the
user types in.

Arguments are detected by their types and properties and can be in any order.
`stdin` is the first writable stream and `stdout` is the first readable stream.
`stdin` and `stdout` can be the same readable/writable stream.

Use `''` for `sep` to not show any characters.

license
=======

MIT/X11

install
=======

With [npm](http://npmjs.org) do:

    npm install pw
