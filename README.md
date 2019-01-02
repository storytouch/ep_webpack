# ep_webpack
Etherpad plugin to bundle files using webpack

## Ignore a plugin

Sometimes an installed plugin is not ready to be used with webpack, so it is possible to ignore it when building the bundle: just include the part(s) of the plugin on your `settings.json`:

```json
  "ep_webpack": {
    "ignoredParts": ["autocomp", "comments_page"]
  }
```

## Plugins with known issues

- [ep_autocomp](https://github.com/jdittrich/ep_autocomp): cannot be bundled yet, needs to be ignored
