var path = require('path');
var fs = require('graceful-fs');
var webpack = require('webpack');
var _ = require('underscore');

var cssBundler = require('./cssBundler');

var DEFAULT_WEBPACK_CONFIG = './webpack.config.js';
var isProduction = process.env.NODE_ENV !== 'development';

exports.generateBundle = function(pluginParts, settings, done) {
  exports.buildIndexAndGenerateBundle(
    pluginParts,
    settings,
    saveFile,
    generateDistributionFile,
    done,
  );
}

// Expose this method to be able to test it
exports.buildIndexAndGenerateBundle = function(pluginParts, settings, createFile, generateBundledFile, done) {
  var mySettings = settings.ep_webpack || {};
  var partsToBeIgnored = mySettings.ignoredParts || [];
  var shouldBundleCSS = mySettings.bundleCSS;
  var webpackConfigs = buildWebpackConfigs(mySettings.customWebpackConfigFile, settings);

  var allClientHooks = getAllClientHooks(pluginParts, partsToBeIgnored);
  var jsFilesToBundle = getListOfJsFilesToBundle(allClientHooks);

  var cssBundleProps = shouldBundleCSS ? cssBundler.analyzeListOfCssFilesToBundle(allClientHooks) : {};
  var cssFilesToBundle = cssBundleProps.cssFilesToBundle || [];
  var externalCssFiles = cssBundleProps.externalCssFiles || [];
  var cssHooksToBeSkipped = cssBundleProps.cssHooksToBeSkipped || [];

  generateClientIndex(jsFilesToBundle, cssFilesToBundle, createFile, function(err) {
    if (err) {
      done(err);
    } else {
      generateBundledFile(webpackConfigs, function(err, webpackHash) {
        if (err) {
          done(err);
        } else {
          if (shouldBundleCSS) {
            deleteOriginalCssHooks(allClientHooks, cssHooksToBeSkipped);
          }
          replaceOriginalHookWithBundledHooks(allClientHooks, jsFilesToBundle, webpackHash);
          generateCssHookFile(externalCssFiles, shouldBundleCSS, webpackHash, createFile, done);
        }
      });
    }
  });
}

var buildWebpackConfigs = function(customConfigFile, otherSettings) {
  var webpackConfigFile = customConfigFile || DEFAULT_WEBPACK_CONFIG;
  var webpackConfigs = require(webpackConfigFile);

  // disable minify options on webpack if settings has it turned off
  if (!otherSettings.minify) {
    delete webpackConfigs.optimization;
    delete webpackConfigs.devtool;
  }

  return webpackConfigs;
}

/*
  Input (pluginParts): [{PART_CONFIG}, ..., {PART_CONFIG}]
    PART_CONFIG: {
      client_hooks: {
        postAceInit: 'ep_myplugin/static/js/file',
        aceInitialized: 'ep_myplugin/static/js/other_file:aliasedHook',
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
  // ep_webpack should be ignored by default
  var allPartsToBeIgnored = _.union(partsToBeIgnored, ['ep_webpack']);

  return _(pluginParts)
    .chain()
    .reject(function(part) { return allPartsToBeIgnored.includes(part.name) })
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
var getListOfJsFilesToBundle = function(allClientHooks) {
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
var generateClientIndex = function(jsFilesToBundle, cssFilesToBundle, createFile, done) {
  var allFilesToBundle = [...jsFilesToBundle, ...cssFilesToBundle];
  var fileContent = _(allFilesToBundle).map(function(file, index) {
    return 'exports.f' + index + ' = require("' + file + '");';
  }).join('\n');

  createFile('static/js/index.js', fileContent, done);
}
/*
  Generate a file on ep_webpack/static/js/aceEditorCSS.js that returns all external CSS
  files + the bundled CSS.
  Example:
    exports.aceEditorCSS = function() {
      return [
        '//fonts.googleapis.com/css',
        (...)
        'ep_webpack/static/dist/css/all.css'
      ];
    }
*/
var generateCssHookFile = function(extraCssFilePaths, cssFilesWereBundled, webpackHash, createFile, done) {
  // include bundled CSS only if it was generated
  var allCssFiles = cssFilesWereBundled ? [...extraCssFilePaths, bundledCssFilePath(webpackHash)] : extraCssFilePaths;

  var fileList = _(allCssFiles).map(function(file) {
    return '"' + file + '"';
  }).join(',');

  var fileContent = 'exports.aceEditorCSS = function() { return [' + fileList + '] }';
  createFile('static/js/aceEditorCSS.js', fileContent, done);
}

  // we only add hash to files on non-dev environments
var bundledCssFilePath = function(webpackHash) {
  var cssFileName = isProduction ? `all-${webpackHash}.css` : 'all.css';
  return `ep_webpack/static/dist/css/${cssFileName}`;
}
var bundledJsFileName = function(webpackHash) {
  return isProduction ? `index-${webpackHash}` : 'index';
}

var saveFile = function(filePath, fileContent, done) {
  var clientIndexPath = path.normalize(path.join(__dirname, filePath));
  fs.writeFile(clientIndexPath, fileContent, done);
}

var generateDistributionFile = function(webpackConfigs, done) {
  webpack(webpackConfigs, function(err, stats) {
    var error;
    if (err || stats.hasErrors()) {
      error = err || stats.compilation.errors;
    }

    done(error, stats.hash);
  });
}

var replaceOriginalHookWithBundledHooks = function(allClientHooks, bundledFiles, webpackHash) {
  var bundledFile = bundledJsFileName(webpackHash);

  _(allClientHooks).each(function(thisPluginHooks) {
    _(thisPluginHooks).each(function(hookPath, hookName) {
      // hookPath might have an alias to the function name, so remove it
      var hookParts = hookPath.split(':');
      var filePath = hookParts[0];
      var hookAlias = hookParts[1] || hookName;

      // each bundled file was aliased `f#`, where `#` is its index on `bundledFiles`
      var fileAlias = `f${bundledFiles.indexOf(filePath)}`;

      // ex: postAceInit = "ep_webpack/static/dist/js/index:f17.postAceInit"
      thisPluginHooks[hookName] = `ep_webpack/static/dist/js/${bundledFile}:${fileAlias}.${hookAlias}`;
    });
  })
}

var deleteOriginalCssHooks = function(allClientHooks, cssHooksToBeSkipped) {
  _(allClientHooks)
    .chain()
    // remove paths to be skipped
    .reject(function(thisPluginHooks) {
      return cssHooksToBeSkipped.includes(thisPluginHooks.aceEditorCSS);
    })
    // remove hooks
    .each(function(thisPluginHooks) {
      delete thisPluginHooks.aceEditorCSS
    })
}

// copied from ethepad-lite/src/static/js/pluginfw/shared.js
var loadFn = function(path, hookName) {
  var functionName
    , parts = path.split(":");

  // on windows: C:\foo\bar:xyz
  if (parts[0].length == 1) {
    if (parts.length == 3) {
      functionName = parts.pop();
    }
    path = parts.join(":");
  } else {
    path = parts[0];
    functionName = parts[1];
  }

  var fn = require(path);
  functionName = functionName ? functionName : hookName;

  _.each(functionName.split("."), function (name) {
    fn = fn[name];
  });
  return fn;
};
