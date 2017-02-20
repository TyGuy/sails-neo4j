const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Unlinking Nodes', function () {
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

	it('should unlink 2 nodes', function (done) {
    adapter.unlink(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, {}, (err, _results) => {
      if (err) { done(err) }

      adapter.getRelatedNodes(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, {}, (err, results) => {
        if (err) { done(err) }

        assert.equal(results.length, 0)

        done()
      })

    })
	})
})
