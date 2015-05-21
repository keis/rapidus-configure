# rapidus-configure

[![NPM Version][npm-image]](https://npmjs.org/package/rapidus-configure)
[![Build Status][travis-image]](https://travis-ci.org/keis/rapidus-configure)
[![Coverage Status][coveralls-image]](https://coveralls.io/r/keis/rapidus-configure?branch=master)

Keep your logging setup in a configuration file.

## Installation

```bash
npm install --save rapidus-configure
```


## Usage

```javascript
configure(config, <hier>, <module>)
```

Calling the exported function with a configuration hash will take care of
creating and configuring the specified loggers, sinks and processors. It
expects a plain object but you probably want to load from a configuration file
but that is left to the user.

```javascript
configure(
  { logger:
    { db: { level: 'WARN' }
    , web: { level: 'DEBUG' }
    }
  , sinks:
    [ { type: 'console'
      , format: ':name - :levelName - :message'
      }
    ]
  })
```


By default it will configure the main logger hierarchy exported by `rapidus`
and load modules relative to itself. If you are creating a separate hierarchy
or want to load functions from within your app you need to use the extra
parameters of configure.

```javascript
var rapidus = require('rapidus')
  , configure = require('rapidus-configure')
  , hier = rapidus.createHierarchy()

configure({...}, hier, module);
```


## Options

* `proxy` - Boolean

    If `true` configure `cluster` workers to proxy their messages to the
    master. Default false.

* `defaultProcessors` - Array

    An array of options for processors that will be applied to all loggers.

* `sinks` - Array

    An array of options for sinks that will be connected to the root logger.

* `logger` - Object

    A mapping from logger name to logger settings.


### Logger options

* `propagate` - Boolean

    If `false` configure the logger to not propagate events further up the
    hierarchy. Default true.

* `level` - Number|String

    The minimum log level that needs to be met for a message to be processed.

* `sinks`

    An array of options for sinks that will be connected to the logger.

* `processors` - Array

    An array of options for processors that will be applied to the logger.


### Sink options

* `type` - String

    A string specifying the factory method to use to create the sink.

* `format` - Object
 - `format.type` - String

    A string specifying the factory method to use to create the formatter.

 - `format.*` Other options are passed through as is and their use depends on the type.

* `*` Other options are passed through as is and their use depends on the type.

### Processor options

* `type` - String

    A string specifying the factory method to use to create the sink.

* `*` Other options are passed through as is and their use depends on the type.

## Resolving functions

In any part of the configuration that calls for a type a string made up of a
module path as used in `require()` optionally followed by a attribute name
within brackets is expected.

e.g `module/submodule[attribute]` is equivalent to
`require('module/submodule').attribute`

Relative paths are supported but will be loaded relative to `rapidus-configure`
unless the root module is specified when calling `configure`

> Mighty Hogweed is avenged.


[npm-image]: https://img.shields.io/npm/v/rapidus-configure.svg?style=flat
[travis-image]: https://img.shields.io/travis/keis/rapidus-configure.svg?style=flat
[coveralls-image]: https://img.shields.io/coveralls/keis/rapidus-configure.svg?style=flat
