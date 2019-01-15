# ep_webpack
Etherpad plugin to bundle files using webpack.

## How does this plugin work?

1. on the first server-side hook after plugins are loaded ([`loadSettings`](http://etherpad.org/doc/v1.7.0/#index_loadsettings)), we get the original list of plugins & their hooks on `plugins.parts` (defined on `ep_etherpad-lite/static/js/pluginfw/plugins`);
1. for each file containing a client-side hook, we import it on a single file (`ep_webpack/static/js/index.js`). This allows us to use a single entry point for all dependencies;
1. then, we generate the bundle using `webpack`. A new file is created: `ep_webpack/static/js/dist/index`;
1. after that, for each client-side hook, we override the path for its definition with the generated file, making Etherpad call a single JS file for all the plugins it loads on the client.

## Performance improvements

The more plugins your Etherpad instace uses, the more this plugin can improve the performance of the initial load of the pads. On an instance without any plugin `ep_webpack` won't have any impact; but on an instance with 30 plugins, the time it took to load improved from **48s to 14s** (from 411 requests to 177)!!

## Available customizations

### Ignore a plugin

Sometimes an installed plugin is not ready to be used with webpack, so it is possible to ignore it when building the bundle: just include the part(s) of the plugin on your `settings.json` (notice that you need to exclude the _parts_, **not the plugins**):

```json
  "ep_webpack": {
    /* Ignores parts (not plugins) not ready to be bundled */
    "ignoredParts": ["autocomp", "comments_page"]
  }
```

### Use your own set of [`webpack` configs](https://webpack.js.org/configuration/)

`ep_webpack` comes with a set of default configs to bundle the files, but you can override them by defining a JS object that will be used when bundling files:

```json
  "ep_webpack": {
    /*
     * Path to the custom webpack config file. Must be an absolute path,
     * or relative to etherpad-lite/node_modules/ep_webpack/.
     */
    "customWebpackConfigFile": "path/to/your/webpack.config.js"
  }
```

