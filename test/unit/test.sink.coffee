{Sink} = require 'rapidus'

describe "configureSink", ->
  {configureSink} = require '../../lib/configure'
  {self} = require '../module'

  it "creates a `Sink` instance", ->
    sink = configureSink self,
      type: 'console'

    assert.instanceOf sink, Sink

  it "creates a sink with a specific factory", ->
    sink = configureSink self,
      type: './bar[kitchen]'

    assert.instanceOf sink, Sink
    assert.propertyVal sink, 'kitchen', true

  it "uses configured format", ->
    sink = configureSink self,
      type: 'console',
      format:
        type: './foo'

    str = sink.format()
    assert.equal str, "this is a foormatter"

  it "does not modify the config object", ->
    sentinel = {}
    config =
      type: 'console',
      format:
        type: './foo'
        test: sentinel

    sink = configureSink self, config

    assert.strictEqual config.format.test, sentinel
