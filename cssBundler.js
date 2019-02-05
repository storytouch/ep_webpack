var _ = require('underscore');
var packageInfo = require('./package.json');

var EXTRA_ERROR_INFO1 = 'Could not load the list of CSS files from aceEditorCSS hook, so its files won\'t be bundled.'
var EXTRA_ERROR_INFO2 = `Please check "${packageInfo.homepage}" for troubleshooting information.`;

var EXTERNAL_FILE_REGEXP = /^(https?:)?\/\//;
var EXTERNAL = 'external';
var INTERNAL = 'internal';

/*
  Try to extract the list of CSS files of the plugins so they can be bundled
  later. External references are not bundled, and if there's an error when
  trying to extract the list of CSS files of a plugin part, that part will not
  be affected and its CSS files won't be bundled.

  - Input: array of CLIENT_HOOKS, where CLIENT_HOOKS is:
    {
      aceEditorCSS: 'ep_myplugin/static/js/file',
      aceInitialized: 'ep_myplugin/static/js/other_file:aliasedHook',
      (...)
    }

  - Output: object with props:
  {
    // CSS files that could be read and can be bundled
    cssFilesToBundle: [
      'ep_foo/static/css/bar.css',
      (...)
    ],
    // files that cannot be bundled, as they are external references
    externalCssFiles: [
      'https://foo.com/bar.css',
      '//fonts.googleapis.com/css',
      (...)
    ],
    // files where aceEditorCSS hook could not be executed, and that should
    // not be affected at all
    cssHooksToBeSkipped: [
      'ep_with_error/css/index.css',
      (...)
    ],
  }
*/
exports.analyzeListOfCssFilesToBundle = function(allClientHooks) {
  var jsFilesWithCssHook = _(allClientHooks)
    .chain()
    // extract only aceEditorCSS hooks
    .map(function(clientHooks) {
      return clientHooks.aceEditorCSS;
    })
    // remove parts without aceEditorCSS hook
    .compact()
    .value();

  var pathsNotLoaded = [];
  var allCssFiles = _(jsFilesWithCssHook)
    .chain()
    .map(function(cssHookPath) {
      try {
        // loads the file on cssHookPath (which might raise an error if cssHookPath
        // depends on the bowser context -- like having a global `window` var
        // defined, for example)
        var aceEditorCSS = loadFn(cssHookPath, 'aceEditorCSS');
        var cssFiles = aceEditorCSS();

        // remove "/" on the beginning of the file paths, but only for those that
        // are not external files starting with "//"
        var cleanedCssFiles = _(cssFiles).map(function(cssFile) {
          var startsWithSingleSlash = cssFile.startsWith('/') && !cssFile.startsWith('//');
          return startsWithSingleSlash ? cssFile.substring(1) : cssFile;
        });

        return cleanedCssFiles;
      } catch(error) {
        console.error(`Error when trying to load "${cssHookPath}".`);
        console.error(EXTRA_ERROR_INFO1);
        console.error(EXTRA_ERROR_INFO2);

        // include hook path on the list of failures
        pathsNotLoaded.push(cssHookPath);

        // no CSS file could be loaded for this path
        return [];
      }
    })
    .flatten()
    .value();

  // finally, split CSS files between external references (those that won't be
  // bundled) and internal ones
  var cssFileGroups = _(allCssFiles).groupBy(function(cssFile) {
    return EXTERNAL_FILE_REGEXP.test(cssFile) ? EXTERNAL : INTERNAL;
  });

  return {
    cssFilesToBundle: cssFileGroups[INTERNAL],
    externalCssFiles: cssFileGroups[EXTERNAL],
    cssHooksToBeSkipped: pathsNotLoaded,
  };
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
