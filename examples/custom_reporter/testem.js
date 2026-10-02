import MyReporter from './my-reporter.js';

export default {
  framework: 'mocha+chai',
  src_files: [
    'hello*.js',
  ],
  reporter: new MyReporter()
};
