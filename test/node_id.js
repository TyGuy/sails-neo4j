const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Node id and _id', function () {
  const id1 = 'abcde'
  const nodeProps1 = Object.assign({}, { name: 'node1', id: id1 }, nodeProps)
  // const nodeProps2 = Object.assign({}, { name: 'node2', id: id2 }, nodeProps)

  const relationshipType = 'CONNECTED_TO'

  let node1, node2, relationship

 	before(() => { return TestHelper.registerConnection() })
  afterEach(() => { return TestHelper.cleanDB() })

  // beforeEach((done) => {
  //   adapter.create(connectionName, null, nodeProps1, (err, results1) => {
  //     node1 = results1[0]
  //     adapter.create(connectionName, null, nodeProps2, (err, results2) => {
  //       node2 = results2[0]
  //       done()
  //     })
  //   })
  // })

  it('should create and return the id, and also return _id', (done) => {
    adapter.create(connectionName, null, nodeProps1, (err, results) => {
      const node = results[0]

      assert.equal(node.id, id1)
      assert(node._id)

      done()
    })
  })

  describe('retrieving and updating', () => {
    let nodeInternalId

    beforeEach((done) => {
      adapter.create(connectionName, null, nodeProps1, (err, results) => {
        nodeInternalId = results[0]._id

        done()
      })
    })

    it('finds the nodes correctly with id', (done) => {
      const criteria = { where: { id: id1 } }

      adapter.find(connectionName, null, criteria, (err, findResults) => {
        const node = findResults[0]

        assert.equal(node.id, id1)
        assert.equal(node._id, nodeInternalId)

        done()
      })
    })

    it('finds the nodes correctly with _id', (done) => {
      const criteria = { where: { _id: nodeInternalId } }

      adapter.find(connectionName, null, criteria, (err, findResults) => {
        const node = findResults[0]

        assert.equal(node.id, id1)
        assert.equal(node._id, nodeInternalId)

        done()
      })
    })

    it('updates the nodes correctly with id', (done) => {
      const criteria = { where: { id: id1 } }
      const updateParams = { name: 'butts', id: 'nonsense' }

      adapter.update(connectionName, null, criteria, updateParams, (err, updateResults) => {
        const node = updateResults[0]

        assert.equal(node.id, id1)
        assert.equal(node._id, nodeInternalId)
        assert.equal(node.data.name, 'butts')

        done()
      })
    })

    it('updates the nodes correctly with _id', (done) => {
      const criteria = { where: { _id: nodeInternalId } }
      const updateParams = { name: 'butts', _id: 9999999, id: 'nonsense' }

      adapter.update(connectionName, null, criteria, updateParams, (err, updateResults) => {
        const node = updateResults[0]

        assert.equal(node.id, id1)
        assert.equal(node._id, nodeInternalId)
        assert.equal(node.data.name, 'butts')

        done()
      })
    })
  })
})
