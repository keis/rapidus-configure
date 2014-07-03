var _ = require('underscore'),
    sigmund = require('sigmund'),
    rapidus = require('rapidus'),
    proxy = require('rapidus/lib/proxy'),
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

    if (!spec) {
        throw new Error("Invalid type `" + typename + "`");
    }

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

// Configure a log record processor
function configureProcessor(root, config) {
    var processor = resolveType(root, config.type);
    return processor(config);
}

// Figure out what to create or delete based on configuration signatures.
// Objects not managed by this module will be left alone.
function reconfigure(existing, config, configure) {
    var reap = {},
        create = [];

    // build map of configured objects signature-> array index
    _.each(existing, function (obj, idx) {
        if (obj._config_signature) {
            reap[obj._config_signature] = idx;
        }
    });

    // Iterate over config to find new entities that need to be configured
    _.each(config, function (value) {
        var sig = sigmund(value),
            obj = reap[sig];

        if (obj !== void 0) {
            // If a existing object can be used save it from reaping
            delete reap[sig];
        } else {
            create.push(value);
        }
    });

    // Remove any entity that was managed by this module but is no longer
    // needed
    _.each(_.values(reap).sort().reverse(), function (idx) {
       existing.splice(idx, 1);
    });

    // Configure new objects
    _.each(create, configure);
}

// Configure a single logger in the hierarchy
function configureLogger(root, hier, name, config) {
    var logger = name ? hier.loggers[name] : hier.root,
        oldSignature = logger && logger._config_signature,
        signature = {p: {}, s: {}};

    // Get logger instance from configured factory or by the default mechanism
    // of the hierarchy
    if (config.type) {
        signature.type = sigmund(config.type);
        if (logger) {
            if (!oldSignature || oldSignature.type !== signature.type) {
                throw new Error(
                    "Trying to change type of logger `" + name + "`, ");
            }
        } else {
            logger = resolveType(root, config.type)(name);
        }

        // TODO: Needs a real set logger that takes care of maintaining the hierarchy
        hier.loggers[name] = logger;
    } else {
        signature.type = sigmund('<default>');
        if (logger) {
            if (oldSignature && oldSignature.type !== signature.type) {
                throw new Error(
                    "Trying to change type of logger `" + name + "`, ");
            }
        } else {
            logger = hier.getLogger(name);
        }
    }

    // Store the signature on the object
    logger._config_signature = signature;

    // Configure the level
    if (config.level) {
        logger.setLevel(config.level);
    }

    // Configure all processors that should be attached and reap
    // existing ones no longer wanted
    reconfigure(logger.processors, config.processors, function (value) {
        var proc = configureProcessor(root, value);
        proc._config_signature = sigmund(value);
        logger.addProcessor(proc);
    });

    // Configure all sinks that should be attached and reap
    // existing ones no longer wanted
    reconfigure(logger.sinks, config.sinks, function (value) {
        var sink = configureSink(root, value);
        sink._config_signature = sigmund(value);
        logger.addSink(sink);
    });

    return logger;
}

// Entry point for converting a JSON structure to a fully configured hierarchy
// of loggers.
function configure(config, hier, rootModule) {
    rootModule = rootModule || module;
    hier = hier || rapidus.getLogger().hier;

    if (config.proxy) {
        if (config.proxy !== true) {
            throw new Error("proxy must  `true` or a falsy value");
        }

        if (proxy.isAvailable()) {
            hier.proxy = proxy.createClient();
        } else {
            proxy.createServer(null, hier);
        }
    }

    _.each(config.defaultProcessors, function (value) {
        hier.addDefaultProcessor(configureProcessor(rootModule, value));
    });

    configureLogger(rootModule, hier, null, config);
    _.each(config.logger, function (value, key) {
        configureLogger(rootModule, hier, key, value);
    });
}

module.exports = configure;
module.exports.resolveType = resolveType;
module.exports.configureFormat = configureFormat;
module.exports.configureSink = configureSink;
module.exports.configureLogger = configureLogger;
