'use strict';

var Bluebird = require('bluebird');
var path = require('path');

var expect = require('chai').expect;

var HookRunner = require('../lib/hook_runner');

describe('HookRunner', function() {
  describe('run', function() {
    var hookRunner;
    var config = {
      get: function(key) {
        switch (key) {
          case 'test_hook':
            return { exe: 'node', args: ['-e', 'console.log(process.env.PATH)'] };
        }
      }
    };

    beforeEach(function() {
      hookRunner = new HookRunner(config);
    });

    it('adds the local node modules to the path', function() {
      return Bluebird.fromCallback(function(callback) {
        hookRunner.run('test_hook', {}, callback);
      }).then(function(stdout) {
        expect(stdout).to.contain(path.join(process.cwd(), 'node_modules', '.bin'));
      });
    });
  });
});
