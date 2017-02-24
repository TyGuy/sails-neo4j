const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const testNodeProps = TestHelper.testNodeProps

describe('Updating Nodes', function () {
  const oldName = 'old'
  const newName = 'new'
  const nodeProps = Object.assign({}, testNodeProps, { name: oldName })
  let node
  let collectionName

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  beforeEach((done) => {
    adapter.create(connectionName, collectionName, nodeProps, function(err, results) {
			if (err) { done(err) }

      node = results[0]
      done()
    })
  })

  describe('with no collectionName', () => {
    collectionName = null

  	it('should update one node to have the new name', function (done) {
      const params = { where: { id: node.id } }
      const values = { name: newName }
  		adapter.update(connectionName, collectionName, params, values, function(err, results) {
  			if (err) {
          done(err)
        }

        // returns 1 item
  			assert.equal(results.length, 1)

  			// verify saved
  			const newNode = results[0]
  			assert.equal(newNode.id, node.id)

        // call data to check props
        assert.equal(newNode.data.name, newName)

        // check to make sure 'labels' is present
        assert(newNode.labels)

  			done()
  		})
  	})
  })

  describe('with a collection name', () => {
    collectionName = 'users'

  	it('should update one node to have the new name', function (done) {
      const params = { where: { id: node.id } }
      const values = { name: newName }
  		adapter.update(connectionName, collectionName, params, values, function(err, results) {
  			if (err) {
          done(err)
        }

        // returns 1 item
  			assert.equal(results.length, 1)

  			// verify saved
  			const newNode = results[0]
  			assert.equal(newNode.id, node.id)

        // call data to check props
        assert.equal(newNode.data.name, newName)

        // check to make sure 'labels' is present
        assert(newNode.labels)
        assert.equal(newNode.labels[0], collectionName)

  			done()
  		})
  	})
  })

  describe('when matching and new params have the same keys', () => {
    collectionName = 'users'

    it('should still update to the new name', (done) => {
      const params = { where: { name: node.data.name } }
      const values = { name: newName }

  		adapter.update(connectionName, collectionName, params, values, function(err, results) {
  			if (err) { done(err) }

        // returns 1 item
        assert.equal(results.length, 1)

        // verify saved
        const newNode = results[0]
        assert.equal(newNode.id, node.id)

        // call data to check props
        assert.equal(newNode.data.name, newName)

        // check to make sure 'labels' is present
        assert(newNode.labels)
        assert.equal(newNode.labels[0], collectionName)

  			done()
  		})
    })
  })
})
