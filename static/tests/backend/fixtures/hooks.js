exports.ep_plugin_with_css = function() {
  return [
    'ep_plugin_with_css/static/css/styles1.css',
    'ep_plugin_with_css/static/css/styles2.css',
  ];
}

exports.ep_plugin_with_css_starting_with_slash = function() {
  return [
    '/ep_plugin_with_css_starting_with_slash/static/css/styles.css',
  ];
}

exports.ep_plugin_with_external_css = function() {
  return [
    '//external/reference/styles.css',
    'ep_plugin_with_external_css/static/css/styles1.css',
    'ep_plugin_with_external_css/static/css/styles2.css',
  ];
}
