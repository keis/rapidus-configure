describe "configureFormat", ->
    {configureFormat} = require '../../lib/'
    {self} = require '../module'

    it "creates a formatter from pattern string", ->
        format = configureFormat self, 'test-:foo'
        assert.isFunction format
        str = format
            foo: 'test'
        assert.equal str, 'test-test'

    it "creates a formatter of a specific type", ->
        format = configureFormat self,
            type: './foo'
        assert.isFunction format
        str = format
            foo: 'test'
        assert.equal str, 'this is a foormatter'
