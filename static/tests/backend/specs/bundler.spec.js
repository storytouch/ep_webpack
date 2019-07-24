var expect = require('chai').expect;
var _ = require('underscore');

var buildIndexAndGenerateBundle = require('../../../../bundler').buildIndexAndGenerateBundle;
var plugins = require('../fixtures/plugin_parts');

var bundledJsFile = 'ep_webpack/static/dist/js/index';
var bundledCssFile = 'ep_webpack/static/dist/css/all.css';

describe('Plugin Bundler', function() {
  var deepCopyOf = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  var originalPluginParts;
  var getCSSHookOfPart = function(partName) {
    var targetPart = _(originalPluginParts).findWhere({ name: partName });
    return targetPart.client_hooks.aceEditorCSS;
  }

  // store static/js/index.js & aceEditorCSS.js contents, so we can verify it later
  var lastClientIndex, lastCssHook;
  var saveClientIndex = function(fileName, fileContent, done) {
    if (fileName.endsWith('index.js')) {
      lastClientIndex = fileContent;
    } else {
      lastCssHook = fileContent;
    }

    done();
  }

  // store webpackConfigs content, so we can verify it later
  var lastWebpackConfigs;
  var generateBundledFile = function(webpackConfigs, done) {
    lastWebpackConfigs = webpackConfigs;
    done();
  };

  describe('webpack configs used to bundle files', function() {
    var subject = function(otherSettings, done) {
      var pluginParts = [];
      var partsToBeIgnored = [];
      var mySettings = { ignoredParts: partsToBeIgnored };
      var settings = Object.assign({}, otherSettings, { ep_webpack: mySettings });
      buildIndexAndGenerateBundle(pluginParts, settings, saveClientIndex, generateBundledFile, done);
    }

    context('when settings has "minify" flag turned on', function() {
      before(function(done) {
        this.timeout(5000);
        subject({ minify: true }, done);
      });

      it('has minimization turned on', function() {
        expect(lastWebpackConfigs.optimization).to.not.eq(undefined);
        expect(lastWebpackConfigs.optimization.minimize).to.eq(true);
      });

      it('has devtool configured', function() {
        expect(lastWebpackConfigs.devtool).to.not.eq(undefined);
      });
    });

    context('when settings has "minify" flag turned off', function() {
      before(function(done) {
        subject({ minify: false }, done);
      });

      it('does not have minimization', function() {
        expect(lastWebpackConfigs.optimization).to.eq(undefined);
      });

      it('does not have devtool', function() {
        expect(lastWebpackConfigs.devtool).to.eq(undefined);
      });
    });
  });

  describe('generated index.js file', function() {
    var subject = function(pluginParts, partsToBeIgnored, done) {
      var mySettings = { ignoredParts: partsToBeIgnored };
      var settings = { ep_webpack: mySettings };
      buildIndexAndGenerateBundle(pluginParts, settings, saveClientIndex, generateBundledFile, done);
    }

    context('when plugin has no client hook', function() {
      before(function(done) {
        subject([plugins.ep_plugin_with_no_client_hooks], [], done);
      });

      it('ignores the plugin', function() {
        expect(lastClientIndex).to.eq('');
      });
    });

    context('when plugin should be ignored', function() {
      before(function(done) {
        subject([plugins.ep_plugin_to_be_ignored], ['ep_plugin_to_be_ignored'], done);
      });

      it('does not list the plugin hooks', function() {
        expect(lastClientIndex).to.eq('');
      });
    });

    context('when a single file has multiple client hooks', function() {
      before(function(done) {
        subject([plugins.ep_plugin_with_multiple_hooks_on_same_file], [], done);
      });

      it('lists the file only once', function() {
        var file = 'ep_plugin_with_multiple_hooks_on_same_file/static/js/index';
        var fileRegexp = new RegExp(file, 'g');
        var numberOfFileOccurrences = lastClientIndex.match(fileRegexp).length;
        expect(numberOfFileOccurrences).to.eq(1);
      });
    });

    context('when plugin uses an alias for a hook', function() {
      var nonAliasedPlugin = plugins.ep_regular_plugin;
      var aliasedPlugin = plugins.ep_plugin_with_alias_for_hook;
      var hookName = 'hook1';
      var hookAlias = 'alias_for_hook1';

      before(function(done) {
        subject([nonAliasedPlugin, aliasedPlugin], [], done);
      });

      it('lists all files on the client index of provided plugins', function() {
        expect(lastClientIndex).to.contain('ep_regular_plugin/static/js/index');
        // make sure alias was removed from file name
        expect(lastClientIndex).to.contain('ep_plugin_with_alias_for_hook/static/js/index');
        expect(lastClientIndex).to.not.contain('ep_plugin_with_alias_for_hook/static/js/index:');
      });

      it('maps non-aliased hooks to the hook name', function() {
        expect(nonAliasedPlugin.client_hooks[hookName]).to.eq(`${bundledJsFile}:f0.${hookName}`);
      });

      it('maps aliased hooks to their original alias', function() {
        expect(aliasedPlugin.client_hooks[hookName]).to.eq(`${bundledJsFile}:f1.${hookAlias}`);
      });
    });
  });

  describe('CSS entries on index.js file', function() {
    var subject = function(pluginParts, bundleCSS, done) {
      // create a full copy of each part to avoid leakage to other tests
      originalPluginParts = _(pluginParts).map(function(part) {
        return deepCopyOf(part);
      });

      var mySettings = { bundleCSS: bundleCSS };
      var settings = { ep_webpack: mySettings };
      buildIndexAndGenerateBundle(originalPluginParts, settings, saveClientIndex, generateBundledFile, done);
    }

    context('when CSS should not be bundled', function() {
      before(function(done) {
        var pluginParts = [plugins.ep_plugin_with_css, plugins.ep_webpack];
        subject(pluginParts, false, done);
      });

      it('does not require any CSS file on index.js', function() {
        expect(lastClientIndex).to.not.contain('ep_plugin_with_css/static/css/styles1.css');
        expect(lastClientIndex).to.not.contain('ep_plugin_with_css/static/css/styles2.css');
        expect(lastClientIndex).to.not.contain('ep_webpack/static/dist/css/all.css');
      });

      it('does not includes bundled CSS on aceEditorCSS hook of ep_webpack', function() {
        expect(lastCssHook).to.not.contain(bundledCssFile);
      });

      it('does not change the aceEditorCSS hook of any plugin', function() {
        expect(getCSSHookOfPart('ep_plugin_with_css')).to.not.eq(undefined);
        expect(getCSSHookOfPart('ep_webpack')).to.not.eq(undefined);
      });
    });

    context('when CSS should be bundled', function() {
      before(function(done) {
        var pluginParts = [plugins.ep_plugin_with_css, plugins.ep_webpack];
        subject(pluginParts, true, done);
      });

      it('does not require CSS file of ep_webpack on index.js', function() {
        expect(lastClientIndex).to.not.contain('ep_webpack/static/dist/css/all.css');
      });

      it('requires all CSS files of other plugins on index.js', function() {
        expect(lastClientIndex).to.contain('ep_plugin_with_css/static/css/styles1.css');
        expect(lastClientIndex).to.contain('ep_plugin_with_css/static/css/styles2.css');
      });

      it('includes bundled CSS on aceEditorCSS hook of ep_webpack', function() {
        expect(lastCssHook).to.contain(bundledCssFile);
      });

      it('does not remove the aceEditorCSS hook from ep_webpack', function() {
        expect(getCSSHookOfPart('ep_webpack')).to.not.eq(undefined);
      });

      it('removes the aceEditorCSS hooks from all other plugins', function() {
        expect(getCSSHookOfPart('ep_plugin_with_css')).to.eq(undefined);
      });

      context('and CSS path starts with a single "/"', function() {
        before(function(done) {
          var pluginParts = [plugins.ep_plugin_with_css_starting_with_slash, plugins.ep_webpack];
          subject(pluginParts, true, done);
        });

        it('removes the initial "/" from CSS path on index.js', function() {
          expect(lastClientIndex).to.contain('ep_plugin_with_css_starting_with_slash/static/css/styles.css');
          expect(lastClientIndex).to.not.contain('/ep_plugin_with_css_starting_with_slash/static/css/styles.css');
        });
      });

      context('and CSS files include an external reference', function() {
        before(function(done) {
          var pluginParts = [plugins.ep_plugin_with_external_css, plugins.ep_webpack];
          subject(pluginParts, true, done);
        });

        it('does not require external CSS on index.js', function() {
          expect(lastClientIndex).to.not.contain('//external/reference.css');
        });

        it('requires other CSS files of plugin on index.js', function() {
          expect(lastClientIndex).to.contain('ep_plugin_with_external_css/static/css/styles1.css');
          expect(lastClientIndex).to.contain('ep_plugin_with_external_css/static/css/styles2.css');
        });

        it('includes external CSS on aceEditorCSS hook of ep_webpack', function() {
          expect(lastCssHook).to.contain('//external/reference/styles.css');
        });

        it('includes bundled CSS on aceEditorCSS hook of ep_webpack', function() {
          expect(lastCssHook).to.contain(bundledCssFile);
        });

        it('removes the aceEditorCSS hooks from all other plugins', function() {
          expect(getCSSHookOfPart('ep_plugin_with_external_css')).to.eq(undefined);
        });
      });

      context('and aceEditorCSS hook cannot be executed for one of the plugins', function() {
        before(function(done) {
          var pluginParts = [
            plugins.ep_plugin_with_errors_on_css_hook,
            plugins.ep_plugin_with_external_css,
            plugins.ep_webpack,
          ];

          // avoid error messages to be logged, override console.error
          var originalConsoleError = console.error;
          console.error = function() {};
          subject(pluginParts, true, function() {
            // restore console.error
            console.error = originalConsoleError;

            done();
          });
        });

        it('does not require any CSS from problematic plugin on index.js', function() {
          expect(lastClientIndex).to.not.contain('ep_plugin_with_errors_on_css_hook/static/css');
        });

        it('requires other CSS files of plugin on index.js', function() {
          expect(lastClientIndex).to.contain('ep_plugin_with_external_css/static/css/styles1.css');
          expect(lastClientIndex).to.contain('ep_plugin_with_external_css/static/css/styles2.css');
        });

        it('includes bundled CSS on aceEditorCSS hook of ep_webpack', function() {
          expect(lastCssHook).to.contain(bundledCssFile);
        });

        it('does not remove the aceEditorCSS hook from plugin plugin', function() {
          expect(getCSSHookOfPart('ep_plugin_with_errors_on_css_hook')).to.not.eq(undefined);
        });

        it('removes the aceEditorCSS hooks from all other plugins', function() {
          expect(getCSSHookOfPart('ep_plugin_with_external_css')).to.eq(undefined);
        });
      });
    });
  });
});
