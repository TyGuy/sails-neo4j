const assert = require('assert')
const utils = require('../../lib/helpers/utils')

describe('encodeProps', () => {
  const props = {
    a: null,
    b: undefined,
    c: 1,
    d: 'abcd',
    e: ['name', 'fido'],
    f: { name: 'fido' },
  }

  it('encodes objects as JSON strings, leaving everything else the same', () => {
    const encoded = utils.encodeProps(props)

    assert.equal(encoded.a, props.a)
    assert.equal(encoded.b, props.b)
    assert.equal(encoded.c, props.c)
    assert.equal(encoded.d, props.d)
    assert.equal(encoded.e, props.e)
    assert.equal(encoded.f, '{"name":"fido"}')
  })

  it('does not fail on null or undefined', () => {
    assert.equal(utils.encodeProps(null), null)
    assert.equal(utils.encodeProps(undefined), undefined)
  })
})
