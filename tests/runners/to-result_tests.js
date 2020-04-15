'use strict';

const toResult = require('../../lib/runners/to-result');
const assert = require('chai').assert;

const Config = require('../../lib/config');
const dummyChromeStderrOutput = `
[0414/010630.566144:INFO:cpu_info.cc(53)] Available number of cores: 32
[0414/010630.566233:VERBOSE1:zygote_main_linux.cc(217)] ZygoteMain: initializing 0 fork delegates
[0414/010630.574976:VERBOSE1:webrtc_internals.cc(120)] Could not get the download directory.

DevTools listening on ws://127.0.0.1:37715/devtools/browser/ad696654-9a10-4236-b4d5-a44fa17f988f
[0414/010630.582057:VERBOSE1:breakpad_linux.cc(2070)] Non Browser crash dumping enabled for: renderer
[0414/010630.582186:VERBOSE1:simple_index_file.cc(599)] Simple Cache Index is being restored from disk.
[0414/010630.601512:ERROR:paint_controller.cc(548)] PaintController::FinishCycle() completed
[0414/010725.025511:INFO:CONSOLE(965)] "Hello World"
[0414/010725.038506:INFO:CONSOLE(965)] "Error while processing route: random.route Cannot read property 'attributes' of undefined TypeError: Cannot read property 'attributes' of undefined
    at Class._normalizeProjection (https://localhost:4444/assets/vendor.js:100:36)
    at Class._normalizeProjections (https://localhost:4444/assets/vendor.js:120:14)`;
const infoOnlyChromeStderr = `
 [0414/010630.566144:INFO:cpu_info.cc(53)] Available number of cores: 32
[0414/010725.025511:INFO:CONSOLE(965)] "Hello World"
[0414/010725.038506:INFO:CONSOLE(965)] "Error while processing route: random.route Cannot read property 'attributes' of undefined TypeError: Cannot read property 'attributes' of undefined
    at Class._normalizeProjection (https://localhost:4444/assets/vendor.js:100:36)
    at Class._normalizeProjections (https://localhost:4444/assets/vendor.js:120:14)
`;

describe.only('toResult', function() {
  describe('for Chrome', function() {
    it('only info logs are displayed when chrome_stderr_info_only is true', function() {
      const config = new Config('ci', {
        chrome_stderr_info_only: true,
      });
      const browserProcess = {
        name: 'Chrome',
        stderr: dummyChromeStderrOutput,
      };
      const result = toResult(1, new Error('some error'), 0, browserProcess, config);

      assert(result.error.message, `Error: some error\nStderr:\n${infoOnlyChromeStderr}`);
    });

    it('all logs are displayed when chrome_stderr_info_only is false', function() {
      const config = new Config('ci', {
        chrome_stderr_info_only: false,
      });
      const browserProcess = {
        name: 'Chrome',
        stderr: dummyChromeStderrOutput,
      };
      const result = toResult(1, new Error('some error'), 0, browserProcess, config);

      assert(result.error.message, `Error: some error\nStderr:\n${dummyChromeStderrOutput}`);
    });
  });
  describe('for other browsers', function() {
    it('all logs are displayed when chrome_stderr_info_only is true', function() {
      const config = new Config('ci', {
        chrome_stderr_info_only: true,
      });
      const browserProcess = {
        name: 'Firefox',
        stderr: dummyChromeStderrOutput,
      };
      const result = toResult(1, new Error('some error'), 0, browserProcess, config);

      assert(result.error.message, `Error: some error\nStderr:\n${dummyChromeStderrOutput}`);
    });

    it('all logs are displayed when chrome_stderr_info_only is false', function() {
      const config = new Config('ci', {
        chrome_stderr_info_only: false,
      });
      const browserProcess = {
        name: 'Firefox',
        stderr: dummyChromeStderrOutput,
      };
      const result = toResult(1, new Error('some error'), 0, browserProcess, config);

      assert(result.error.message, `Error: some error\nStderr:\n${dummyChromeStderrOutput}`);
    });
  });
});
