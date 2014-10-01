var page = require('webpage').create();
var url = phantom.args[0];
page.viewportSize = {
  width: 1024,
  height: 768
};
page.open(url);
