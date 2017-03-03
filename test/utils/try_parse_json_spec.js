const assert = require('assert')
const utils = require('../../lib/helpers/utils')

describe('tryParseJSON', () => {
  const a = null
  const b = undefined
  const c = 1
  const d = 'abcd'
  const e = [1, 2, 3]
  const f = { name: 'fido' }
  const g = '{ "valid": "JSON" }'
  const h = '{ invalid: "JSON" }'
  const i = '["invalid", "JSON"]'

  it('works', () => {
    assert.equal(a, utils.tryParseJSON(a))
    assert.equal(b, utils.tryParseJSON(b))
    assert.equal(c, utils.tryParseJSON(c))
    assert.equal(d, utils.tryParseJSON(d))
    assert.equal(e, utils.tryParseJSON(e))
    assert.equal(f, utils.tryParseJSON(f))
    assert.equal(h, utils.tryParseJSON(h))
    assert.equal(i, utils.tryParseJSON(i))

    // the only actual json string to get turned into an object
    const gOutput = utils.tryParseJSON(g)
    assert.equal(gOutput.valid, 'JSON')
  })
})
