var plugins = require('ep_etherpad-lite/static/js/pluginfw/plugins');
var pluginUtils = require('ep_etherpad-lite/static/js/pluginfw/shared');
var bundler = require('./bundler');

// rebuild bundles
// TODO implement them
exports.pluginUninstall = function(hook, context) {}
exports.pluginInstall = function(hook, context) {}

// build bundle for the first time
exports.loadSettings = function(hook, context) {
  var settings = context.settings;
  var mySettings = settings.ep_webpack || {};

  // store a copy of original plugin parts, so we can re-generate them later
  originalParts = deepCopyOf(plugins.parts);

  buildBundle(mySettings);
}

var deepCopyOf = function(obj) {
  return JSON.parse(JSON.stringify(obj));
}

var buildBundle = function(settings) {
  var partsToBeIgnored = settings.ignoredParts || [];

  // restore original plugin parts, so we can re-generate using them as reference
  plugins.parts = deepCopyOf(originalParts);

  bundler.generateBundle(plugins.parts, partsToBeIgnored, function(err) {
    // TODO handle error when generating bundle
    if (err) {
      throw err;
    } else {
      // re-generate hooks, so the new source is retrieved when pad is loaded.
      // This line was copied from `plugins.update()`.
      plugins.hooks = pluginUtils.extractHooks(plugins.parts, "hooks", plugins.pathNormalization);
    }
  });
}
