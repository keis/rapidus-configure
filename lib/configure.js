var _ = require('underscore')
  , sigmund = require('sigmund')
  , sparseSplice = require('sparse-splice')
  , values = require('object-values')
  , assign = require('object-assign')
  , rapidus = require('rapidus')
  , proxy = require('rapidus/lib/proxy')
  , sinks = require('rapidus/lib/sinks')
  , builtin

builtin = sinks

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
    , module

  if (!spec) {
    throw new Error('Invalid type `' + typename + '`')
  }

  if (!spec[2] && builtin[spec[1]]) {
    return builtin[spec[1]]
  }

  module = root.require(spec[1])

  if (!spec[2]) {
    return module
  }

  return module[spec[2]]
}

// Create a filter function that only include elements applicable for the given
// mode.  on a master node the default is true to on a worker it's false.
function enabledFor(mode) {
  return function (config) {
    return (config[mode] !== void 0) ? config[mode] : mode === 'master'
  }
}

// Create a format function for a sink. The input can either be a pattern
// string or a hash. In the case of a pattern string a formatter will be
// created by using `createFormatter` from `rapidus`. Alternatively a hash with
// a type property that resolves to function can be given and that will be
// called with the entire config to create the format function.
function configureFormat(root, config) {
  if (config.type) {
    return resolveType(root, config.type)(config)
  }
  return sinks.createFormatter(config)
}

// Create a sink from the config hash. The only required property is the `type`
// of sink to create. if `format` is given is will be processed by
// `configureFormat` before being passed to the sink factory.
function configureSink(root, config) {
  var factory = resolveType(root, config.type)
    , sink

  // process format config before sending to factory
  if (config.format) {
    config = assign({}, config, {format: configureFormat(root, config.format)})
  }

  sink = factory(config)
  sink._configSignature = sigmund(config)
  return sink
}

// Configure a log record processor
function configureProcessor(root, config) {
  var factory = resolveType(root, config.type)
    , proc = factory(config)

  proc._configSignature = sigmund(config)
  return proc
}

// Figure out what to create or delete based on configuration signatures.
// Objects not managed by this module will be left alone.
function reconfigure(existing, config, configure) {
  var reap = {}
    , create = []

  config = config || [];

  // build map of configured objects [signature -> array index]
  existing.forEach(function (obj, idx) {
    if (obj._configSignature) {
      reap[obj._configSignature] = idx
    }
  })

  // Iterate over config to find new entities that need to be configured
  config.forEach(function (value) {
    var sig = sigmund(value)
      , obj = reap[sig]

    if (obj !== void 0) {
      // If a existing object can be used save it from reaping
      delete reap[sig]
    } else {
      create.push(value)
    }
  })

  // Remove any entity that was managed by this module but is no longer
  // needed
  sparseSplice(existing, values(reap))

  // Configure new objects
  create.forEach(configure)
}

// Configure a single logger in the hierarchy
function configureLogger(root, hier, name, config) {
  var mode = hier.proxy ? 'worker' : 'master'
    , logger = name ? hier.loggers[name] : hier.root
    , oldSignature = logger && logger._configSignature
    , signature
    , sinksConfig
    , placeholder

  // The logger from the hierarchy might be a placeholder
  placeholder = (logger instanceof rapidus.PlaceHolder) ? logger : void 0

  // Construct a signature of the type
  signature = sigmund(_.pick(config, ['type']))

  // Get logger instance from configured factory or by the default mechanism
  // of the hierarchy
  if (config.type) {
    if (logger && !placeholder) {
      if (!oldSignature || oldSignature !== signature) {
        throw new Error(
          'Trying to change type of logger `' + name + '`')
      }
    } else {
      config = assign({}, config, {hier: hier, name: name})
      logger = resolveType(root, config.type)(config)

      // Store the logger in the hierarchy and make sure the hierarchy is
      // updated with the logger in the new position
      hier.loggers[name] = logger
      hier.manageLogger(logger, placeholder)
    }
  } else {
    if (logger && !placeholder) {
      if (oldSignature && oldSignature !== signature) {
        throw new Error(
          'Trying to change type of logger `' + name + '`')
      }
    } else {
      logger = hier.getLogger(name)
    }
  }

  // Store the signature on the object
  logger._configSignature = signature

  // Configure the level
  if (config.level !== void 0) {
    logger.setLevel(config.level)
  }

  // Set the propagate flag
  if (config.propagate !== void 0) {
    logger.propagate = !!config.propagate
  }

  // Configure all processors that should be attached and reap
  // existing ones no longer wanted
  reconfigure(logger.processors, config.processors, function (value) {
    var proc = configureProcessor(root, value)
    logger.addProcessor(proc)
  })

  // Configure all sinks that should be attached and reap
  // existing ones no longer wanted
  sinksConfig = _.filter(config.sinks, enabledFor(mode))
  reconfigure(logger.sinks, sinksConfig, function (value) {
    var sink = configureSink(root, value)
    logger.addSink(sink)
  })

  return logger
}

// Configure the log record proxy of the hierarchy
function configureProxy(hier, config) {
  // Require explicit true for possibility to specify proxy options in the
  // future
  if (config !== true) {
    throw new Error('proxy must be `true` or a falsy value')
  }

  // Skip setup if either a server or client already exists.
  if (hier.proxy || hier.proxyServer) {
    return
  }

  // Detect if this should be the server or client and setup accordingly
  if (proxy.isAvailable()) {
    hier.proxy = proxy.createClient()
  } else {
    hier.proxyServer = proxy.createServer(null, hier)
  }
}

// Entry point for converting a JSON structure to a fully configured hierarchy
// of loggers.
function configure(config, hier, rootModule) {
  rootModule = rootModule || module
  hier = hier || rapidus.getLogger().hier

  if (config.proxy) {
    configureProxy(hier, config.proxy)
  }

  reconfigure(hier.defaultProcessors, config.defaultProcessors, function (value) {
    var proc = configureProcessor(rootModule, value)
    hier.addDefaultProcessor(proc)
  })

  configureLogger(rootModule, hier, null, config)
  _.each(config.logger, function (value, key) {
    configureLogger(rootModule, hier, key, value)
  })
}

module.exports = configure
module.exports.resolveType = resolveType
module.exports.configureFormat = configureFormat
module.exports.configureSink = configureSink
module.exports.configureProcessor = configureProcessor
module.exports.configureLogger = configureLogger
