const assert = require('assert')
const utils = require('../../lib/helpers/utils')

describe('nodeString', () => {
  const nodeName = 'n'
  const collection = 'dogs'
  const params = { name: 'fido', breed: 'pugshit' }

  it('works with just a node name', () => {
    const expected = '(n)'
    const output = utils.nodeString(nodeName)

    assert.equal(expected, output)
  })

  it('works with a node name and collection', () => {
    const expected = '(n:dogs)'
    const output = utils.nodeString(nodeName, collection)

    assert.equal(expected, output)
  })

  // note that this doesn't actually add the values directly, it adds
  // placeholders that can be added to the neo4j http params
  it('works with a node name and params', () => {
    const expected = `(n { name: {name}, breed: {breed} })`
    const output = utils.nodeString(nodeName, null, params)

    assert.equal(expected, output)
  })

  it('works if collection is empty string', () => {
    const expected = `(n { name: {name}, breed: {breed} })`
    const output = utils.nodeString(nodeName, '', params)

    assert.equal(expected, output)
  })

  it('works with all args passed', () => {
    const expected = `(n:dogs { name: {name}, breed: {breed} })`
    const output = utils.nodeString(nodeName, collection, params)

    assert.equal(expected, output)
  })
})
