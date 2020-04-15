'use strict';

const log = require('npmlog');

module.exports = function toResult(launcherId, err, code, runnerProcess, config, testContext) {
  let logs = [];
  let message = '';
  testContext = testContext ? testContext : {};

  if (err) {
    logs.push({
      type: 'error',
      text: err.toString()
    });

    message += err + '\n';
  }

  if (testContext.name) {
    logs.push({
      type: 'error',
      text: `Error while executing test: ${testContext.name}`
    });

    message += `Error while executing test: ${testContext.name}\n`;
  }

  if (code !== 0) {
    logs.push({
      type: 'error',
      text: 'Non-zero exit code: ' + code
    });

    message += 'Non-zero exit code: ' + code + '\n';
  }

  if (runnerProcess && runnerProcess.stderr) {
    const stderr = runnerProcess.stderr;
    logs.push({
      type: 'error',
      text: stderr
    });
    message += 'Stderr: \n ';

    if (runnerProcess.name !== 'Chrome' || !config.get('chrome_stderr_info_only')) {
      message += `${stderr} \n`;
    } else {
      // Only add stderr entries from INFO class of logs. Examples of chrome logs:
      // [0414/233637.067608:INFO:cpu_info.cc(53)] Available number of cores: 16
      // [0414/011733.473770:INFO:CONSOLE(965)] "image-media-file-reader-waiter: Error
      //     at TestWaiterImpl.beginAsync (https://localhost:4444/assets/vendor.js:211718:19)
      //     at waitForPromise (https://localhost:4444/assets/vendor.js:211984:22)
      // [0414/233637.201815:VERBOSE1:network_delegate.cc(32)] NetworkDelegate::NotifyBeforeURLRequest: https://localhost:4444/assets/index.html
      const stderrArray = runnerProcess.stderr.split('\n');
      const chromeLogPrefixRegex = /\[\d{4}\/\d{6}.\d{6}:\w*:.*\(\d*\)\].*/;
      let infoLogPrefer = false;

      stderrArray.forEach(stderr => {
        const containsChromeLogPrefex = chromeLogPrefixRegex.test(stderr);
        if (containsChromeLogPrefex && stderr.includes('INFO:')) {
          message += `${stderr} \n`;
          infoLogPrefer = true;
        } else if (containsChromeLogPrefex) {
          infoLogPrefer = false;
        } else if (infoLogPrefer) {
          message += `${stderr} \n`;
        }
      });
    }
  }

  if (runnerProcess && runnerProcess.stdout) {
    logs.push({
      type: 'log',
      text: runnerProcess.stdout
    });

    message += 'Stdout: \n ' + runnerProcess.stdout + '\n';
  }

  if (config && config.get('debug')) {
    log.info(runnerProcess.name + '.stdout', runnerProcess.stdout);
    log.info(runnerProcess.name + '.stderr', runnerProcess.stderr);
  }

  let result = {
    failed: code === 0 && !err ? 0 : 1,
    passed: code === 0 && !err ? 1 : 0,
    name: 'error',
    testContext: testContext,
    launcherId: launcherId,
    logs: logs
  };
  if (!result.passed) {
    result.error = {
      message: message
    };
  }

  return result;
};
