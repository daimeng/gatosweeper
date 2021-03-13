const glob = require('glob');
const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const generateHTMLPlugins = () => glob.sync('./src/**/*.html').map(
  dir => new HTMLWebpackPlugin({
    filename: path.basename(dir), // Output
    template: dir, // Input
  }),
);

module.exports = {
  entry: ['./src/js/app.js', './src/style/main.scss'],
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'app.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.html$/,
        loader: 'raw-loader',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(scss|sass)$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/static/',
          globOptions: {
            dot: true,
            gitignore: true,
            ignore: ["**/*.xcf"],
          },
          to: './static/',
        },
      ]
    }),
    ...generateHTMLPlugins(),
  ],
  stats: {
    colors: true,
  },
  devtool: 'source-map',
};
