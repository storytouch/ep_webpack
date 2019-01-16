var path = require('path');
var webpack = require('webpack');

var isProduction = process.env.NODE_ENV !== 'development';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: path.resolve(__dirname, 'static/js/index.js'),

  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, './static/js/dist'),
    // create bundles with module.exports, so ep.json can access those targets
    libraryTarget: 'commonjs2',
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
  ],

  watchOptions: isProduction ? {} : {
    // optimize pooling: don't check dependencies + wait a little bit to check.
    // This avoids having the CPU melting when we have watch mode turned on
    ignored: /ep_*\/node_modules/,
    poll: 600
  },

  // Disable AMD for jQuery plugins
  module: {
    rules: [
      {
        test: /jquery.+\.js$/,
        use: "ep_webpack/node_modules/imports-loader?define=>false",
      }
    ],
  },
};
