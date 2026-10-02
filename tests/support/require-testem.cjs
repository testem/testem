const Api = require('testem');

if (typeof Api !== 'function' || Api.name !== 'Api') {
  console.error(Api);
  process.exit(1);
}

process.stdout.write(Api.name + '\n');
