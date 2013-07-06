var processUtils = require('../lib/process_utils'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect

chai.use(sinonChai)

describe('exit', function() {
  it('calls process.exit() with the passed in error code', function() {
    var proc = {
      exit: function() {},
      stdout: { bufferSize: 0 },
      stderr: { bufferSize: 0 }
    }

    sinon.spy(proc, 'exit')
    processUtils.exit(proc, 1)

    expect(proc.exit).to.have.been.calledOnce
    expect(proc.exit).to.have.been.calledWith(1)
  })

  it('waits for buffers to drain before calling process.exit()', function() {
    var drain = function(str, callback) {
      callback()
    }

    var proc = {
      exit: function() {},
      stdout: {
        bufferSize: 20,
        once: drain
      },
      stderr: {
        bufferSize: 20,
        once: drain
      }
    }

    sinon.spy(proc, 'exit')
    sinon.spy(proc.stdout, 'once')
    sinon.spy(proc.stderr, 'once')
    processUtils.exit(proc, 0)

    expect(proc.stdout.once).to.have.been.calledOnce
    expect(proc.stdout.once).to.have.been.calledWith('drain')
    expect(proc.stderr.once).to.have.been.calledOnce
    expect(proc.stderr.once).to.have.been.calledWith('drain')
    expect(proc.exit).to.have.been.calledOnce
    expect(proc.exit).to.have.been.calledWith(0)
  })
})
