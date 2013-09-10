var strutils = require('../../strutils')

function TapReporter(silent, out){
  this.out = out || process.stdout
  this.silent = silent
  this.stoppedOnError = null
  this.id = 1
  this.total = 0
  this.pass = 0
  this.results = []
}
TapReporter.prototype = {
  report: function(prefix, data){
    this.results.push({
      launcher: prefix,
      result: data
    })
    this.display(prefix, data)
    this.total++
    if (data.passed) this.pass++
  },
  errorDisplay: function(err){
    var inside = Object.keys(err)
      .filter(function(key){
        return key !== 'passed'
      })
      .map(function(key){
        return key + ': >\n' + strutils.indent(err[key])
      })
    return strutils.indent([
      '---',
      strutils.indent(inside.join('\n')),
      '...'].join('\n'))
  },
  resultDisplay: function(prefix, result){
    var line = (prefix ? (prefix + ' - ') : '') + 
      result.name.trim()
    return (result.passed ? 'ok ' : 'not ok ') +
      (this.id++) + ' ' + line
  },
  summaryDisplay: function(){
    var lines = [
      '1..' + this.total,
      '# tests ' + this.total,
      '# pass  ' + this.pass,
      '# fail  ' + (this.total - this.pass)
    ]
    if (this.pass === this.total){
      lines.push('')
      lines.push('# ok')
    }
    return lines.join('\n')
  },
  display: function(prefix, result){
    if (this.silent) return
    this.out.write(this.resultDisplay(prefix, result) + '\n')
    if (result.error){
      this.out.write(this.errorDisplay(result.error) + '\n')
    }
  },
  displayError: function(err){
    if (this.silent) return
    this.write('1 not ok "' + err.message.trim() + '"\n')
  },
  finish: function(){
    if (this.silent) return
    this.out.write('\n' + this.summaryDisplay() + '\n')
  }
}



module.exports = TapReporter