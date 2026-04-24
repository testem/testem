const notifier = require('node-notifier');

exports.notify = function notify(opts) {
  return notifier.notify(opts);
};
