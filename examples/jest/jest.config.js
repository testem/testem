'use strict';

module.exports = {
  testEnvironment: 'node',
  watchman: false,
  testMatch: ['<rootDir>/tests.js'],
  reporters: [
    ['jest-tap-reporter', {
      logLevel: 'ERROR',
      showHeader: false
    }]
  ]
};
