const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Getting Linked Nodes', function () {
  const nodeProps1 = Object.assign({}, { name: 'node1' }, nodeProps)
  const nodeProps2 = Object.assign({}, { name: 'node2' }, nodeProps)

  const relationshipType = 'CONNECTED_TO'

  let node1, node2, relationship

 	before(() => { return TestHelper.registerConnection() })
  afterEach(() => { return TestHelper.cleanDB() })

  beforeEach((done) => {
    adapter.create(connectionName, null, nodeProps1, (err, results1) => {
      node1 = results1[0]
      adapter.create(connectionName, null, nodeProps2, (err, results2) => {
        node2 = results2[0]
        adapter.link(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, {}, (err, results3) => {
          relationship = results3[0]
          done()
        })
      })
    })
  })

	it('does NOT return connected nodes via OUTGOING relationships', function (done) {
    adapter.getInNodes(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, {}, (err, results) => {

      assert.equal(results.length, 0)
      done()
    })
	})

	it('returns the connected nodes via INCOMING relationships', function (done) {
    adapter.getInNodes(connectionName, null, nodeProps2, null, nodeProps1, relationshipType, {}, (err, results) => {
      assert.equal(results.length, 1)
      relatedNode = results[0]
      assert.equal(relatedNode._id, node1._id)

      done()
    })
	})
})
