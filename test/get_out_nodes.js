const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Getting Linked Nodes', function () {
  const nodeProps1 = Object.assign({}, { name: 'node1' }, nodeProps)
  const nodeProps2 = Object.assign({}, { name: 'node2' }, nodeProps)
  const nodeProps3 = Object.assign({}, { name: 'node3' }, nodeProps)
  const relProps = { status: 'pending' }

  const relationshipType = 'CONNECTED_TO'

  let node1, node2, node3, rel12, rel13

 	before(() => { return TestHelper.registerConnection() })
  afterEach(() => { return TestHelper.cleanDB() })

  beforeEach((done) => {
    adapter.create(connectionName, null, nodeProps1, (err, results1) => {
      node1 = results1[0]
      adapter.create(connectionName, null, nodeProps2, (err, results2) => {
        node2 = results2[0]
        adapter.create(connectionName, null, nodeProps3, (err, results3) => {
          node3 = results3[0]

          adapter.link(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, relProps, (err, results4) => {
            rel12 = results4[0]
            adapter.link(connectionName, null, nodeProps1, null, nodeProps3, relationshipType, relProps, (err, results5) => {
              rel13 = results5[0]

              done()
            })
          })
        })
      })
    })
  })

	it('should return the connected nodes via OUTGOING relationships', function (done) {
    adapter.getOutNodes(connectionName, null, nodeProps1, null, {}, relationshipType, {}, (err, results) => {

      assert.equal(results.length, 2)
      assert.equal(results[0].id, node3.id)
      assert.equal(results[1].id, node2.id)

      done()
    })
	})

  describe('when given sort order', () => {
  	it('should return the related nodes in order', function (done) {
      adapter.getOutNodes(connectionName, null, nodeProps1, null, { sort: [{ name: 'asc' }] }, relationshipType, {}, (err, results) => {

        assert.equal(results.length, 2)
        assert.equal(results[0].id, node2.id)
        assert.equal(results[1].id, node3.id)

        done()
      })
    })
  })

	it('should not return the connected nodes via INCOMING relationships', function (done) {
    adapter.getOutNodes(connectionName, null, nodeProps2, null, nodeProps1, relationshipType, {}, (err, results) => {

      assert.equal(results.length, 0)

      done()
    })
	})

  it('should work with rel props', (done) => {
    adapter.getOutNodes(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, relProps, (err, results) => {

      assert.equal(results.length, 1)

      done()
    })
  })
})
