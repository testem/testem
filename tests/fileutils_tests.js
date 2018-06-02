'use strict';

const path = require('path');

const expect = require('chai').expect;
const sinon = require('sinon');

const fileutils = require('../lib/fileutils');
const addToPATH = require('../lib/add-to-PATH');

describe('fileutils', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('fileExists', function() {
    it('returns true for an existing file', function() {
      return fileutils.fileExists(__filename).then(function(result) {
        expect(result).to.be.true();
      });
    });

    it('returns false for an existing directory', function() {
      return fileutils.fileExists(__dirname).then(function(result) {
        expect(result).to.be.false();
      });
    });

    it('returns false for a not existing directory', function() {
      return fileutils.fileExists('./not-existing.js').then(function(result) {
        expect(result).to.be.false();
      });
    });
  });

  describe('executableExists', function() {
    it('returns true for an existing executable', function() {
      return fileutils.executableExists('node').then(function(result) {
        expect(result).to.be.true();
      });
    });

    it('allows to define custom options', function() {
      let options = {
        env: addToPATH(path.join(process.cwd(), 'tests/fixtures/processes'))
      };

      return fileutils.executableExists('bin-test', options).then(function(result) {
        expect(result).to.be.true();
      });
    });

    it('returns false for an not existing executable', function() {
      return fileutils.executableExists('not-found').then(function(result) {
        expect(result).to.be.false();
      });
    });
  });
});
