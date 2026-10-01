import notifier from "toasted-notifier";

function notify(opts) {
  return notifier.notify(opts);
}

export default { notify };
