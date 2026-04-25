const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './tests/hello_test.js',
  output: {
    path: __dirname,
    filename: 'test-bundle.js'
  },
  resolve: {
    fallback: {
      fs: false,
      buffer: require.resolve('buffer/'),
      process: require.resolve('process/browser')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ]
};
