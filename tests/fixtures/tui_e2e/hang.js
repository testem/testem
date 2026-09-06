// Stays alive so quit_twice can exercise a second q. TAP from a child that
// never exits does not reach the dashboard, so rerun still uses Alpha.
const fs = require('fs');
fs.writeSync(1, '1..1\n');
fs.writeSync(1, 'ok 1 hang-fixture\n');
setInterval(function () {}, 60000);
