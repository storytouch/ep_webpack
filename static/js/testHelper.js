var $ = require('ep_etherpad-lite/static/js/rjquery').$;

// inject reference to the bundled jQuery, so tests can access it and simulate
// jQuery events
exports.postAceInit = function(hook, context) {
  pad.plugins = pad.plugins || {};
  pad.plugins.ep_webpack = pad.plugins.ep_webpack || {};
  pad.plugins.ep_webpack.$ = $;
}
