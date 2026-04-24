const notifier = require('toasted-notifier');

exports.notify = function notify(opts) {
  return notifier.notify(opts);
};
