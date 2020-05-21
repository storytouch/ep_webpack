// override method to create pads, so we can inject the bundled jQuery on padChrome$
var _newPad = helper.newPad;

helper.newPad = function(cb, padName, opts) {
  var customCb = function() {
    // get the bundled jQuery and inject it into padChrome$
    var thisPlugin = helper.padChrome$.window.pad.plugins.ep_webpack;

    if (thisPlugin) {
      // get references to window and document before replacing the original padChrome$
      var win = helper.padChrome$.window;
      var doc = helper.padChrome$.document;

      // repeat what is done on helper.getFrameJQuery
      var bundledJquery = thisPlugin.$;
      helper.padChrome$ = bundledJquery;
      helper.padChrome$.window = win;
      helper.padChrome$.document = doc;
    }

    cb();
  };

  opts = opts || {};
  opts.cb = customCb;

  _newPad(opts, padName);
};
