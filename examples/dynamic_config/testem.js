FS = require('fs')

module.exports = {
  framework: "jasmine",
  on_change: function(config, data, callback) {
    FS.writeFileSync('./last_changed_file', data.file)
    callback()
  }
}