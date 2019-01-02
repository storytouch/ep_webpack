var expect = require('chai').expect;
var buildIndexAndGenerateBundle = require('../../../../bundler').buildIndexAndGenerateBundle;
var plugins = require('../fixtures/plugin_parts');

var distFile = 'ep_webpack/static/js/dist/index';

describe('Plugin Bundler', function() {
  // store static/js/index.js content, so we can verify it later
  var lastClientIndex;
  var saveClientIndex = function(fileContent, done) {
    lastClientIndex = fileContent;
    done();
  }

  // do nothing
  var generateBundledFile = function(done) { done() };

  var subject = function(pluginParts, partsToBeIgnored, done) {
    buildIndexAndGenerateBundle(pluginParts, partsToBeIgnored, saveClientIndex, generateBundledFile, done);
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

  // avoid circular dependency
  context('when ep_webpack has client hooks', function() {
    before(function(done) {
      subject([plugins.ep_webpack], [], done);
    });

    it('ignores them', function() {
      expect(lastClientIndex).to.not.contain('ep_webpack');
    });
  });

  describe('when plugin uses an alias for a hook', function() {
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
      expect(nonAliasedPlugin.client_hooks[hookName]).to.eq(`${distFile}:f0.${hookName}`);
    });

    it('maps aliased hooks to their original alias', function() {
      expect(aliasedPlugin.client_hooks[hookName]).to.eq(`${distFile}:f1.${hookAlias}`);
    });
  });
});
