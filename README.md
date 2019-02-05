# ep_webpack
Etherpad plugin to bundle files using webpack, thus improving the performance of file loading on client-side.

#### Why should you use this plugin?

Sometimes the browser takes **FOREVER** to load Etherpad editor, especially on instances with a lot of plugins, and with each plugin using a lot of files. On an instance with 30+ plugins and 400+ files to load, it can take **up to a minute** for the pad to be ready to be edited.

By installing this plugin you can speed up this process a lot:

* time to load without `ep_webpack`: **48s** (411 requests);
* time to load with `ep_webpack` bundling only JS files: **21s** (177 requests);
* time to load with `ep_webpack` bundling JS + CSS files: **14s** (57 requests);

#### Features:

* **Speeds up Etherpad loading on browser [by 70%](#why-should-you-use-this-plugin)**;
* Bundle **all plugins by default**, but [allow plugins to be ignored by `webpack`](#ignore-a-plugin)
* Bundled files are **automatically updated** on [local environment](#development-mode)
* **Minimize files** on non-dev environments;
* Allow **[bundle of CSS files](#bundle-css-files-too)**;
* Allow styling plugins **using SASS**;
* Provide default webpack configuration, but [allow them to be customized](#use-your-own-set-of-webpack-configs);
* Use `webpack v.4`;

## Development mode

This plugin has a _watch_ mode, so you don't need to restart Etherpad every time you change something on the plugin files. To use it, just go the the folder where `ep_webpack` is installed, and run the `watch` command:

```bash
cd path/to/etherpad-lite/node_modules/ep_webpack && npm run watch
```

If Docker is your thing, you can add this to your `docker-compose.yml`:

```yml
  webpack:
    # ideally, use the same image used by Etherpad containers
    image: node:8.9.0
    environment:
      NODE_ENV: "development"
    command: bash -c "cd /etherpad-lite/node_modules/ep_webpack && npm run watch"
    volumes:
      - path/to/etherpad-lite/:/etherpad-lite/
```

## How does this plugin work?

Here's a short explanation of what `ep_webpack` does to bundle all plugins and serve a single file to the client:

1. on the first server-side hook after plugins are loaded ([`loadSettings`](http://etherpad.org/doc/v1.7.0/#index_loadsettings)), we get the original list of plugins & their hooks on `plugins.parts` (defined on `ep_etherpad-lite/static/js/pluginfw/plugins`);
1. for each file containing a client-side hook, we import it on a single file (`ep_webpack/static/js/index.js`). This allows us to use a single entry point for all dependencies;
1. then, we generate the bundle using `webpack`. A new file is created: `ep_webpack/static/dist/js/index`;
1. after that, for each client-side hook, we override the path for its definition with the generated file, making Etherpad call a single JS file for all the plugins it loads on the client.

If [CSS files should be bundled](#bundle-css-files-too), some extra steps are executed on the flow mentioned above:

1. we try to execute all `aceEditorCSS` hooks in order to get the list of CSS files, and we import them together with the JS single entry point (`ep_webpack/static/js/index.js`);
1. when we run `webpack`, another file is created: `ep_webpack/static/dist/css/all.css`;
1. finally, all `aceEditorCSS` hooks are removed from the plugins, and the only hook of that type will point to the bundled CSS file.

## Available customizations

### Ignore a plugin

Sometimes an installed plugin is not ready to be used with webpack, so it is possible to ignore it when building the bundle: just include the part(s) of the plugin on your `settings.json` (notice that you need to exclude the _parts_, **not the plugins**):

```json
  "ep_webpack": {
    /* Ignores parts (not plugins) not ready to be bundled */
    "ignoredParts": ["autocomp", "comments_page"]
  }
```

### Bundle CSS files too

**Warning: this is an advanced customization and might not work with all the plugins**

If you also want to bundle CSS files, you need to turn this feature on on the `settings.json`:

```json
  "ep_webpack": {
    /* Bundle CSS files too */
    "bundleCSS": true
  }
```

If you enable this feature and start to see error messages on the server console, take a look on the [Troubleshooting session](#troubleshooting).

### Use your own set of [`webpack` configs](https://webpack.js.org/configuration/)

`ep_webpack` comes with a set of [default configs](webpack.config.js) to bundle the files, but you can override them by defining a JS object that will be used when bundling files:

```json
  "ep_webpack": {
    /*
     * Path to the custom webpack config file. Must be an absolute path,
     * or relative to etherpad-lite/node_modules/ep_webpack/.
     */
    "customWebpackConfigFile": "path/to/your/webpack.config.js"
  }
```

## Troubleshooting

The most common type of error is when trying to bundle CSS files. If you see an error message like `Could not load the list of CSS files from aceEditorCSS hook, so its files won't be bundled.`, you'll need to make some changes in order to be able to bundle the CSS files:

- **Extract the hook into a separated file**: [TL;DR:] the most effective way is to change the plugin code in order to extract the `aceEditorCSS` hook into a separated JS file. See [this pull request](https://github.com/jdittrich/ep_autocomp/pull/40) as an example.

  [Long story:] Usually the error when executing the CSS hook happens because the JS file where it is defined needs to be run on the browser context, which is not where it is run when we're bundling the files. For example, the JS file might require `jQuery`:

  ```
  var $ = require('ep_etherpad-lite/static/js/rjquery').$;
  ```

  This will certainly raise an error, as `jQuery` needs `window` to be defined, and it is *not* defined on the server side.

  By putting the `aceEditorCSS` hook in a separated JS file, you'll be able to require it both on client and on server sides without any issue, as this hooks only needs to return an array of strings.

- **Add the problematic plugin to the list of ignored parts**: if you can't submit a pull request to extract `aceEditorCSS` into a separated file, you can [exclude the plugin from the list of bundled parts](#ignore-a-plugin), so at least the other plugins will be able to be bundled;

- **Disable CSS bundling**: finally, you can [disable the CSS bundling](#bundle-css-files-too) entirely, which will allow you to keep bundling at least the JS files;

## Next improvements

Want to help? Here's a list of future improvements this plugins might have:

* [ ] Re-create bundles when plugins installed/uninstalled via `/admin` route;
* [ ] Bundle vendor files (`jQuery`, `underscore`, etc) into a separated chunk, in order to improve cache usage. From `webpack` [docs](https://webpack.js.org/guides/caching/#extracting-boilerplate):
  > It's also good practice to extract third-party libraries, such as `lodash` or `react`, to a separate `vendor` chunk as they are less likely to change than our local source code. This step will allow clients to request even less from the server to stay up to date.
* [ ] Include Etherpad core files to the bundle (this looks like a hard feature to implement);
