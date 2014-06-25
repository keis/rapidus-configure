var _ = require('underscore'),
    sinks = require('rapidus/lib/sinks'),
    builtin;

builtin = sinks;

// resolve a type specifier from the config to a real type
//
// * module/name
//   require("module/name")
//
// * module/name[attribute]
//   require("module/name").attribute
//
// Relative module names are loaded relative to the root module.
function resolveType(root, typename) {
    var spec = /^([a-zA-Z0-9\/.-]*)(?:\[([^\]]*)\])?$/.exec(typename)
        module;

    if (!spec[2] && builtin[spec[1]]) {
        return builtin[spec[1]];
    }

    module = root.require(spec[1]);

    if (!spec[2]) {
        return module;
    }

    return module[spec[2]];
}

module.exports.resolveType = resolveType;
