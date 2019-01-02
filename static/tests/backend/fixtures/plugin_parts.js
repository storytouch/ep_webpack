exports.ep_webpack = {
  name: "ep_webpack",
  client_hooks: {
    hook1: "ep_webpack/static/js/index"
  }
}

exports.ep_regular_plugin = {
  name: "ep_regular_plugin",
  client_hooks: {
    hook1: "ep_regular_plugin/static/js/index"
  }
}

exports.ep_plugin_to_be_ignored = {
  name: "ep_plugin_to_be_ignored",
  client_hooks: {
    hook1: "ep_plugin_to_be_ignored/static/js/index"
  }
}

exports.ep_plugin_with_alias_for_hook = {
  name: "ep_plugin_with_alias_for_hook",
  client_hooks: {
    hook1: "ep_plugin_with_alias_for_hook/static/js/index:alias_for_hook1"
  }
}

exports.ep_plugin_with_multiple_hooks_on_same_file = {
  name: "ep_plugin_with_multiple_hooks_on_same_file",
  client_hooks: {
    hook1: "ep_plugin_with_multiple_hooks_on_same_file/static/js/index",
    hook2: "ep_plugin_with_multiple_hooks_on_same_file/static/js/index",
    hook3: "ep_plugin_with_multiple_hooks_on_same_file/static/js/index"
  }
}

exports.ep_plugin_with_no_client_hooks = {
  name: "ep_plugin_with_no_client_hooks"
}

exports.ep_plugin_with_multiple_parts_part1 = {
  name: "ep_plugin_with_multiple_parts_part1",
  client_hooks: {
    hook1: "ep_plugin_with_multiple_parts/static/js/index1"
  }
}

exports.ep_plugin_with_multiple_parts_part2 = {
  name: "ep_plugin_with_multiple_parts_part2",
  client_hooks: {
    hook2: "ep_plugin_with_multiple_parts/static/js/index2"
  }
}
