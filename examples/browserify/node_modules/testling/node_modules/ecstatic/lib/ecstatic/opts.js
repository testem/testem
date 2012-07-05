// This is so you can have options aliasing and defaults in one place. 

module.exports = function (opts) {

  var autoIndex = !opts
    || [
      'showDir',
      'showdir',
      'autoIndex',
      'autoindex'
    ].some(function (k) {
      // at least one of the flags is truthy.
      // This means that, in a conflict, showing the directory wins.
      // Not sure if this is the right behavior or not.
      return opts[k];
    });

  return {
    cache: (opts && opts.cache) || 3600,
    autoIndex: autoIndex
  }
}
