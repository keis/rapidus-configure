{Logger, Hierarchy} = require 'rapidus'
proxy = require 'rapidus/lib/proxy'
sinon = require 'sinon'
net = require 'net'

describe "configure", ->
    configure = require '../../lib/'
    {self} = require '../module'

    hier = undefined
    beforeEach ->
        # this silly setup should be wrapped as a function in main rapidus
        hier = new Hierarchy new Logger null, 'root', 20
        hier.root.hier = hier

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

        it "creates a proxy server", ->
            config =
                proxy: true

            delete process.env.LOGGING_PROXY
            configure config, hier, self

            assert.property process.env, 'LOGGING_PROXY'