var path = require('path');
var fs = require('graceful-fs');
var webpack = require('webpack');
var _ = require('underscore');

// TODO handle dev & prod environments?
var WEBPACK_CONFIG = require('./webpack.config.js');

exports.generateBundle = function(pluginParts, partsToBeIgnored, done) {
  exports.buildIndexAndGenerateBundle(pluginParts, partsToBeIgnored, saveIndexFile, generateDistributionFile, done);
}

// Expose this method to be able to test it
exports.buildIndexAndGenerateBundle = function(pluginParts, partsToBeIgnored, saveClientIndex, generateBundledFile, done) {
  var allClientHooks = getAllClientHooks(pluginParts, partsToBeIgnored);
  var filesToBundle = getListOfFilesToBundle(allClientHooks);

  generateClientIndex(filesToBundle, saveClientIndex, function(err) {
    if (err) {
      done(err);
    } else {
      generateBundledFile(function(err) {
        if (err) {
          done(err);
        } else {
          replaceOriginalHookWithBundledHooks(allClientHooks, filesToBundle);
          done();
        }
      });
    }
  });
}

/*
  Input (pluginParts): [{PART_CONFIG}, ..., {PART_CONFIG}]
    PART_CONFIG: {
      client_hooks: {
        postAceInit: 'ep_myplugin/static/js/file',
        aceInitialized: 'ep_myplugin/static/js/other_file:aliasedHooke',
        (...)
      },
      (...)
     }

  Output (returned value): [{EXTRACTED_PART_CONFIG}, ..., {EXTRACTED_PART_CONFIG}]
    EXTRACTED_PART_CONFIG: {
      postAceInit: 'ep_myplugin/static/js/file',
      aceInitialized: 'ep_myplugin/static/js/other_file:aliasedHook',
      (...)
    }
*/
var getAllClientHooks = function(pluginParts, partsToBeIgnored) {
  return _(pluginParts)
    .chain()
    .reject(function(part) { return partsToBeIgnored.includes(part.name) })
    .map(function(part) { return part.client_hooks })
    // remove parts without client hooks
    .compact()
    .value();
}

/*
  Input (allClientHooks): [{EXTRACTED_PART_CONFIG}, ..., {EXTRACTED_PART_CONFIG}]
    EXTRACTED_PART_CONFIG: {
      postAceInit: 'ep_myplugin/static/js/file',
      aceInitialized: 'ep_myplugin/static/js/file:aliasedHook',
      (...)
    }

  On [1]: [ARRAY_OF_PATHS_ON_PART, ..., ARRAY_OF_PATHS_ON_PART]
    ARRAY_OF_PATHS_ON_PART: [
      'ep_myplugin/static/js/file',
      'ep_myplugin/static/js/file:aliasedHook',
      (...)
    ]

  On [2]: [
    'ep_myplugin/static/js/file',
    'ep_myplugin/static/js/file:aliasedHook',
    (...)
  ]

  On [3]: [
    'ep_myplugin/static/js/file',
    'ep_myplugin/static/js/file',
    (...)
  ]

  On [4]: [
    'ep_myplugin/static/js/file',
    (...)
  ]
*/
var getListOfFilesToBundle = function(allClientHooks) {
  return _(allClientHooks)
    .chain()
    // get hook paths
    .map(function(part) { return _(part).values() }) // [1]
    .flatten() // [2]
    // remove hook alias
    .map(function(hookPath) { return hookPath.split(':')[0] }) // [3]
    // remove files with more than one hook on it
    .uniq() // [4]
    .value();
}

/*
  Generate a file on ep_webpack/static/js/index.js that imports all plugin hook paths.
  Example:
    exports.f0 = require("ep_myplugin1/static/js/index");
    exports.f1 = require("ep_myplugin2/static/js/other_index");
    exports.f2 = require("ep_myplugin2/static/js/index");
    (...)
*/
var generateClientIndex = function(filesToBundle, saveClientIndex, done) {
  var fileContent = _(filesToBundle).map(function(file, index) {
    return 'exports.f' + index + ' = require("' + file + '");';
  }).join('\n');

  saveClientIndex(fileContent, done);
}

var saveIndexFile = function(fileContent, done) {
  var clientIndexPath = path.normalize(path.join(__dirname, 'static/js/index.js'));
  fs.writeFile(clientIndexPath, fileContent, done);
}

var generateDistributionFile = function(done) {
  webpack(WEBPACK_CONFIG, function(err, stats) {
    if (err || stats.hasErrors()) {
      done(err || stats.compilation.errors);
    } else {
      done();
    }
  });
}

var replaceOriginalHookWithBundledHooks = function(allClientHooks, bundledFiles) {
  _(allClientHooks).each(function(thisPluginHooks) {
    _(thisPluginHooks).each(function(hookPath, hookName) {
      // hookPath might have an alias to the function name, so remove it
      var hookParts = hookPath.split(':');
      var filePath = hookParts[0];
      var hookAlias = hookParts[1] || hookName;

      // each bundled file was aliased `f#`, where `#` is its index on `bundledFiles`
      var fileAlias = `f${bundledFiles.indexOf(filePath)}`;

      // ex: postAceInit = "ep_webpack/static/js/dist/index:f17.postAceInit"
      thisPluginHooks[hookName] = `ep_webpack/static/js/dist/index:${fileAlias}.${hookAlias}`;
    });
  })
}
