var path = require('path');
var webpack = require('webpack');
var merge = require('webpack-merge');

var MiniCssExtractPlugin = require('mini-css-extract-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
var CreateSymlinkPlugin = require('create-symlink-webpack-plugin');
var doNothing = require('noop-webpack-plugin');

var isProduction = process.env.NODE_ENV !== 'development';
var JS_FILENAME = `js/index${isProduction ? '-[hash]': ''}.js`;
var CSS_FILENAME = `css/all${isProduction ? '-[hash]': ''}.css`;
var CSS_SIMPLE_FILENAME = 'css/all.css';

var baseConfigs = {
  mode: isProduction ? 'production' : 'development',
  entry: path.resolve(__dirname, 'static/js/index.js'),

  output: {
    filename: JS_FILENAME,
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
  ],

  /*
  only watch files changes on non-production environments.
  */
  watch: isProduction ? false : true,

  // watch mode (disabled on production)
  watchOptions: isProduction ? {} : {
    // optimize pooling: don't check dependencies + wait a little bit to check.
    // This avoids having the CPU melting when we have watch mode turned on
    ignored: /ep_.*\/node_modules/,
    aggregateTimeout: 1000,

    // watching does not work with NFS and machines in VirtualBox, for those cases
    // please uncomment the line below
    // poll: 1000,
  },

  module: {
    rules: [
      // Disable AMD for jQuery plugins
      {
        test: /jquery.+\.js$/,
        use: 'ep_webpack/node_modules/imports-loader?define=>false',
      },
      // Allow usage of web workers by the plugins. Their name should be *.worker.js
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: { inline: true },
        }
      },
    ],
  },
};

// configs specific for when we need to minify files
var minifyConfigs = {
  // Other options: https://webpack.js.org/configuration/devtool/
  //   - 'inline-cheap-source-map': 12s, 1.8Mb
  //   - 'cheap-source-map':        12s, 0.8Mb
  devtool: 'cheap-source-map',
  optimization: {
    minimize: true,
  },
};

// configs specific for when we need to bundle CSS files
var cssConfigs = {
  plugins: [
    // Bundle CSS into a single file
    new MiniCssExtractPlugin({
      filename: CSS_FILENAME,
    }),
    // Create an alias "all.css" -> "all-[hash].css"
    (CSS_FILENAME !== CSS_SIMPLE_FILENAME) ? new CreateSymlinkPlugin({
      origin: CSS_FILENAME,
      symlink: CSS_SIMPLE_FILENAME
    }) : doNothing(),
  ],

  // Bundle CSS + SASS
  module: {
    rules: [
      {
        test: /\.s?css$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          { loader: 'css-loader' },
          { loader: 'fast-sass-loader' },
        ]
      },
    ],
  },
};

// configs specific for when we need to bundle CSS + minify files
var cssAndMinifyConfigs = {
  // Minify CSS files
  plugins: [
    new OptimizeCssAssetsPlugin(),
  ],
};

module.exports = {
  default: baseConfigs,
  withMinify: merge(baseConfigs, minifyConfigs),
  withCss: merge(baseConfigs, cssConfigs),
  withMinifyAndCss: merge(baseConfigs, cssConfigs, minifyConfigs, cssAndMinifyConfigs),
};
