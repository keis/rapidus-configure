describe "resolveType", ->
  {resolveType} = require '../../lib/configure'
  {self} = require '../module'

  it "resolves a module", ->
    type = resolveType self, './foo'
    assert.isFunction type

  it "resolves an attribute on a module", ->
    type = resolveType self, './bar[funone]'
    assert.propertyVal type, 'value', 1

  it "resolves a builtin type", ->
    type = resolveType self, 'console'
    assert.isFunction type

  it "throws on invalid type string", ->
    assert.throws (-> resolveType self, 'foo[bar'), Error, /invalid type/i
