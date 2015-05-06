{Logger, createHierarchy} = require 'rapidus'
sinon = require 'sinon'

describe "configureLogger", ->
  {configureLogger} = require '../../lib/configure'
  {self} = require '../module'

  hier = undefined
  beforeEach ->
    hier = createHierarchy()

  it "gets the logger from the hierarchy", ->
    logger = new Logger
    hier =
      loggers: {}
      getLogger: sinon.stub().returns logger

    result = configureLogger self, hier, 'foo', {}

    assert.calledOnce hier.getLogger
    assert.calledWith hier.getLogger, 'foo'
    assert.strictEqual result, logger

  it "create a logger with a specific factory", ->
    logger = configureLogger self, hier, 'foo',
      type: './bar[logger]'

    assert.instanceOf logger, Logger
    assert.propertyVal logger, 'bar', true

  it "sets the level of the logger if configured", ->
    logger = configureLogger self, hier, 'foo',
      level: 'debug'

    assert.equal logger.getEffectiveLevel(), 10

  it "sets the propagation flag of the logger if configured", ->
    logger = configureLogger self, hier, 'foo',
      propagate: 0

    assert.strictEqual logger.propagate, false

  it "attaches a processor", ->
    logger = configureLogger self, hier, 'foo',
      processors: [type: './bar[processor]']

    assert.lengthOf logger.processors, 1

  it "attaches a sink", ->
    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchen]']

    assert.lengthOf logger.sinks, 1

  it "does not attach sinks when proxying", ->
    hier.proxy = {}
    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchen]']

    assert.lengthOf logger.sinks, 0

  it "attaches a sinks when proxying if explicitly marked", ->
    hier.proxy = {}
    logger = configureLogger self, hier, 'foo',
      sinks: [
        (type: './bar[kitchen]')
        (type: './bar[kitchen]', worker: true)
      ]

    assert.lengthOf logger.sinks, 1

  it "does not attach a sinks on proxy server if explicitly marked", ->
    logger = configureLogger self, hier, 'foo',
      sinks: [
        (type: './bar[kitchen]')
        (type: './bar[kitchen]', master: false)
      ]

    assert.lengthOf logger.sinks, 1

  it "replaces placeholder with real logger", ->
    sublogger = configureLogger self, hier, 'foo.bar', {}
    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchen]']

    assert.lengthOf logger.sinks, 1
    assert.strictEqual sublogger.parent, logger

  it "replaces placeholder with logger from specific factory", ->
    sublogger = configureLogger self, hier, 'foo.bar', {}
    logger = configureLogger self, hier, 'foo',
      type: './bar[logger]'

    assert.propertyVal logger, 'bar', true
    assert.strictEqual sublogger.parent, logger

  it "uses the same logger when reconfiguring", ->
    firstLogger = configureLogger self, hier, 'foo', {}
    secondLogger = configureLogger self, hier, 'foo', {}

    assert.strictEqual firstLogger, secondLogger

  it "uses the same logger when reconfiguring with specific factory", ->
    firstLogger = configureLogger self, hier, 'foo',
      type: './bar[logger]'
      dummy: 'old'
    secondLogger = configureLogger self, hier, 'foo',
      type: './bar[logger]'
      dummy: 'new'

    assert.strictEqual firstLogger, secondLogger

  it "throws when trying to change type of logger", ->
    logger = configureLogger self, hier, 'foo', {}
    assert.throws (-> configureLogger self, hier, 'foo',
      type: './bar[logger]'
    ), Error, /type of logger/i

  it "throws when trying to change type of logger to generic", ->
    logger = configureLogger self, hier, 'foo',
      type: './bar[logger]'
    assert.throws (
      -> configureLogger self, hier, 'foo', {}
    ), Error, /type of logger/i

  it "reuses logger created outside", ->
    firstLogger = hier.getLogger 'foo'
    secondLogger = configureLogger self, hier, 'foo', {}
    assert.strictEqual firstLogger, secondLogger

  it "reuses existing processor if config is the same", ->
    spy = self.require('./bar').spyProcessor
    spy.reset()

    logger = configureLogger self, hier, 'foo',
      processors: [type: './bar[spyProcessor]']

    logger = configureLogger self, hier, 'foo',
      processors: [type: './bar[spyProcessor]']

    assert.calledOnce spy
    assert.lengthOf logger.processors, 1

  it "removes processor no longer needed", ->
    logger = configureLogger self, hier, 'foo',
      processors: [type: './bar[processor]']

    logger = configureLogger self, hier, 'foo', {}

    assert.lengthOf logger.processors, 0

  it "does not remove processor defined outside", ->
    proc = sinon.stub()

    logger = configureLogger self, hier, 'foo',
      processors: [type: './bar[processor]']
    logger.addProcessor proc

    logger = configureLogger self, hier, 'foo',
      processors: []

    assert.deepEqual logger.processors, [proc]

  it "reuses existing sink if config is the same", ->
    spy = self.require('./bar').kitchenSpy
    spy.reset()

    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchenSpy]']

    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchenSpy]']

    assert.lengthOf logger.sinks, 1

  it "removes sink no longer needed", ->
    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchen]']

    logger = configureLogger self, hier, 'foo', {}

    assert.lengthOf logger.sinks, 0

  it "does not remove sink defined outside", ->
    sink = sinon.stub()

    logger = configureLogger self, hier, 'foo',
      sinks: [type: './bar[kitchen]']
    logger.addSink sink

    logger = configureLogger self, hier, 'foo',
      sinks: []

    assert.lengthOf logger.sinks, 1
