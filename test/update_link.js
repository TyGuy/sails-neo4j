const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Updating a link', function () {
  const nodeProps1 = Object.assign({}, { name: 'node1' }, nodeProps)
  const nodeProps2 = Object.assign({}, { name: 'node2' }, nodeProps)
  const relProps = {}

  const relationshipType = 'CONNECTED_TO'

  let node1, node2, relationship

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  beforeEach((done) => {
    adapter.create(connectionName, null, nodeProps1, (err, results1) => {
      node1 = results1[0]
      adapter.create(connectionName, null, nodeProps2, (err, results2) => {
        node2 = results2[0]
        done()
      })
    })
  })

  describe('when link exists', () => {
    const oldStatus = 'pending'
    const newStatus = 'accepted'
    const oldRelParams = { status: oldStatus }
    const newRelParams = { status: newStatus }

    beforeEach((done) => {
      adapter.link(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, oldRelParams, (err, results) => {
        relationship = results[0]

        done()
      })
    })

    it('updates the link', (done) => {
      assert.equal(relationship.data.status, oldStatus)

      const relData = {
        type: relationshipType,
        matchParams: oldRelParams,
        updateParams: newRelParams
      }

      adapter.updateLink(connectionName, null, nodeProps1, null, nodeProps2, relData, (err, results) => {
        if (err) { done(err) }

        const newRelationship = results[0]
        assert.equal(newRelationship.data.status, newStatus)

        done()
      })
    })
  })
})
