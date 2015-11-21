module.exports = {
  entry: './tests/hello_test.js',
  output: {
    path: __dirname,
    filename: 'test-bundle.js'
  },
  node: {
    fs: "empty"
} 
};
