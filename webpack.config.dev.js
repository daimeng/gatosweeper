const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    contentBase: 'src',
    watchContentBase: true,
    hot: true,
    open: false,
    port: process.env.PORT || 9001,
    host: process.env.HOST || 'localhost',
    stats: {
      // Config for minimal console.log mess.
      colors: true,
      version: false,
      hash: false,
      timings: false,
      chunks: false,
      chunkModules: false
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ya?ml$/,
        type: 'json',
        oneOf: [
          {
            resourceQuery: /stream/,
            options: { asStream: true },
            loader: 'yaml-loader'
          },
          { use: 'yaml-loader' }
        ]
      },
    ],
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
});
