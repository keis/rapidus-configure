{Logger, Hierarchy} = require 'rapidus'
sinon = require 'sinon'

describe "configureLogger", ->
    {configureLogger} = require '../../lib/'
    {self} = require '../module'

    hier = undefined
    beforeEach ->
        hier = new Hierarchy

    it "gets the logger from the hierarchy", ->
        logger = new Logger
        hier =
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

    it "attaches a processor", ->
        logger = configureLogger self, hier, 'foo',
            processors: [type: './bar[processor]']

        assert.lengthOf logger.processors, 1

    it "attaches a sink", ->
        logger = configureLogger self, hier, 'foo',
            sinks: [type: './bar[kitchen]']

        assert.lengthOf logger.sinks, 1
