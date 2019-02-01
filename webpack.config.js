var path = require('path');
var webpack = require('webpack');

var MiniCssExtractPlugin = require('mini-css-extract-plugin');

var isProduction = process.env.NODE_ENV !== 'development';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: path.resolve(__dirname, 'static/js/index.js'),

  output: {
    filename: 'js/index.js',
    path: path.resolve(__dirname, './static/dist'),
    // create bundles with module.exports, so ep.json can access those targets
    libraryTarget: 'commonjs2',
  },

  // where webpack should look for modules required here
  resolveLoader: {
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  },

  plugins: [
    new webpack.ProvidePlugin({
      // use the correct reference when files refer to `jQuery` or `$`
      $: ['ep_etherpad-lite/static/js/rjquery', '$'],
      jQuery: ['ep_etherpad-lite/static/js/rjquery', 'jQuery'],
      // autocomp is defined as a variable on window, other plugins need to
      // require it when they use that variable
      autocomp: ['ep_autocomp/static/js/index', 'autocomp'],
    }),

    // Bundle CSS into a single file
    new MiniCssExtractPlugin({
      filename: 'css/all.css',
    }),
  ],

  // minimize
  // Other options: https://webpack.js.org/configuration/devtool/
  //   - 'inline-cheap-source-map': 12s, 1.8Mb
  //   - 'cheap-source-map':        12s, 0.8Mb
  devtool: 'cheap-source-map',
  optimization: {
    minimize: true,
  },

  // watch mode (disabled on production)
  watchOptions: isProduction ? {} : {
    // optimize pooling: don't check dependencies + wait a little bit to check.
    // This avoids having the CPU melting when we have watch mode turned on
    ignored: /ep_*\/node_modules/,
    poll: 1000
  },

  module: {
    rules: [
      // Disable AMD for jQuery plugins
      {
        test: /jquery.+\.js$/,
        use: 'ep_webpack/node_modules/imports-loader?define=>false',
      },

      // Bundle CSS into a single file
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          'css-loader',
        ]
      }
    ],
  },
};
