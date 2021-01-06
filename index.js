var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');
var pluginDefs = require('ep_etherpad-lite/static/js/pluginfw/plugin_defs');
var pluginUtils = require('ep_etherpad-lite/static/js/pluginfw/shared');
var bundler = require('./bundler');

// rebuild bundles
// TODO implement them
exports.pluginUninstall = function(hook, context) {};
exports.pluginInstall = function(hook, context) {};

// build bundle for the first time
exports.loadSettings = function(hook, context) {
  // store a copy of original plugin parts, so we can re-generate them later
  originalParts = deepCopyOf(pluginDefs.parts);

  buildBundle(context.settings);
};

var deepCopyOf = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

var buildBundle = function(settings) {
  // restore original plugin parts, so we can re-generate using them as reference
  pluginDefs.parts = deepCopyOf(originalParts);

  console.log('ep_webpack: starting to generate bundle...');
  bundler.generateBundle(pluginDefs.parts, settings, function(err) {
    // TODO handle error when generating bundle
    if (err) {
      // we cant' throw error here otherwise etherpad will stop
      console.log('ep_webpack: error on generating the bundle');
      console.log({err});
    } else {
      // re-generate hooks, so the new source is retrieved when pad is loaded.
      // This line was copied from `pluginDefs.update()`.
      pluginDefs.hooks = pluginUtils.extractHooks(pluginDefs.parts, 'hooks', plugins.pathNormalization);
    }

    console.log('ep_webpack: bundle completed!');
  });
};
