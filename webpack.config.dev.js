const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.config.common.js');

module.exports = merge(common, {
  mode: 'development',
  target: 'web',
  resolve: {
    alias: {
      'inferno': 'inferno/dist/index.dev.esm.js',
    },
  },
  devServer: {
    // contentBase: 'src',
    // watchContentBase: true,
    watchFiles: 'src/*',
    hot: true,
    open: false,
    port: process.env.PORT || 9001,
    host: process.env.HOST || 'localhost',
    // stats: {
    //   // Config for minimal console.log mess.
    //   colors: true,
    //   version: false,
    //   hash: false,
    //   timings: false,
    //   chunks: false,
    //   chunkModules: false
    // }
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
});
