var page = require('webpage').create();
var url = phantom.args[0];
page.open(url);
