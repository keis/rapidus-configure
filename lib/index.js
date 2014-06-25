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

// Create a format function for a sink. The input can either be a pattern
// string or a hash. In the case of a pattern string a formatter will be
// created by using `createFormatter` from `rapidus`. Alternatively a hash with
// a type property that resolves to function can be given and that will be
// called with the entire config to create the format function.
function configureFormat(root, config) {
    if (config.type) {
        return resolveType(root, config.type)(config);
    }
    return sinks.createFormatter(config);
}

// Create a sink from the config hash. The only required property is the `type`
// of sink to create. if `format` is given is will be processed by
// `configureFormat` before being passed to the sink factory.
function configureSink(root, config) {
    var sink = resolveType(root, config.type);

    // process format config before sending to factory
    if (config.format) {
        config.format = configureFormat(root, config.format);
    }

    return sink(config);
}

module.exports.resolveType = resolveType;
module.exports.configureFormat = configureFormat;
module.exports.configureSink = configureSink;
