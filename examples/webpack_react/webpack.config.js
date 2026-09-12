module.exports = {
  mode: 'development',
  entry: './src/counter.test.jsx',
  output: {
    path: __dirname,
    filename: 'test-bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-react', { runtime: 'automatic' }]]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
