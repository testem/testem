//Extract arguments
var url = phantom.args[0];
var options = phantom.args[1] ? JSON.parse(phantom.args[1]) : {};

//Create page
var page = require('webpage').create();

//Set viewportSize?
if (options.viewportSize) {
  page.viewportSize = options.viewportSize;
}

//Open page
page.open(url);
