{Sink, Logger, createHierarchy} = require 'rapidus'
proxy = require 'rapidus/lib/proxy'
sinon = require 'sinon'
net = require 'net'

describe "configure", ->
  configure = require '../../lib/configure'
  {self} = require '../module'

  hier = undefined
  beforeEach ->
    hier = createHierarchy()

  it "configures the logger hierarchy", ->
    config =
      logger:
        foo:
          sinks: [{type: './bar[kitchen]'}]

        bar:
          level: 'WARN'

    configure config, hier, self

    assert.property hier.loggers, 'foo'
    assert.property hier.loggers, 'bar'

    foo = hier.getLogger 'foo'
    assert.equal foo.getEffectiveLevel(), 20
    assert.lengthOf foo.sinks, 1

    bar = hier.getLogger 'bar'
    assert.equal bar.getEffectiveLevel(), 30
    assert.lengthOf bar.sinks, 0

  it "configures default processors", ->
    config =
      defaultProcessors: [
        type: './bar[processor]'
      ]

    configure config, hier, self
    sink = new Sink
    sink.write = sinon.stub()

    logger = hier.getLogger()
    logger.addSink sink

    hier.getLogger().error 'test'
    assert.calledOnce sink.write
    assert.calledWith sink.write, sinon.match.has 'processed'

  it "reuses default processors", ->
    spy = self.require './bar'
        .spyProcessor
    spy.reset()

    config =
      defaultProcessors: [
        type: './bar[spyProcessor]'
      ]

    configure config, hier, self
    configure config, hier, self

    logger = hier.getLogger()

    hier.getLogger().error 'test'
    assert.calledOnce spy

  describe "proxy", ->
    server = undefined

    before (done) ->
      server = proxy.createServer null, hier
      process.nextTick ->
        done()

    it "creates a proxy client", ->
      config =
        proxy: true

      configure config, hier, self

      assert.property hier, 'proxy'

    it "does not replace existing proxy client", ->
      config =
        proxy: true

      configure config, hier, self
      proxy = hier.proxy

      configure config, hier, self

      assert.strictEqual hier.proxy, proxy

    it "creates a proxy server", ->
      config =
        proxy: true

      delete process.env.LOGGING_PROXY
      configure config, hier, self

      assert.property process.env, 'LOGGING_PROXY'

    it "throws if config value is truthy but not true", ->
      config =
        proxy: "on"

      assert.throws (-> configure config, hier, hier, self),
              Error
