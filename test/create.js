const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Creating Nodes', function () {

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

	it('should create one node with a property sails_neo4j_test = 1', function (done) {
		adapter.create(connectionName, null, nodeProps, function(err, results) {
			if (err) { throw err }

      // returns 1 item
			assert.equal(results.length, 1)

			// verify saved
			const node = results[0]
			assert(node.id)

      // call data to check props
			var props = results[0].data

			for (let prop in nodeProps) {
				assert.equal(props[prop], nodeProps[prop])
			}

      // check to make sure 'labels' is present
      var labels = results[0].labels
      assert(labels)

			done()
		})
	})

  describe('when given props that have json values', () => {
    const nestedProp = { thing: { deep: 'poop' } }
    const props = Object.assign({}, nodeProps, { nested: nestedProp })

    it('should create a node, and return the props correctly', (done) => {
  		adapter.create(connectionName, null, props, function(err, results) {
  			if (err) { throw err }

  			const nested = results[0].data.nested
        assert.equal(nested.thing.deep, 'poop')

  			done()
  		})
    })
  })

	it('should create multiple nodes with the property sails_neo4j_test = 1', function(done) {
		adapter.createMany(connectionName, null, {props:[nodeProps,nodeProps]}, function(err, results) {
			if (err) { throw err }

			// returns 2 items
			assert.equal(results.length, 2)

			// check ids
			assert(results[0].id)
			assert(results[1].id)

      // spot-check props
			var props = results[0].data

			for (let prop in nodeProps) {
				assert.equal(props[prop], nodeProps[prop])
			}

      // check to make sure 'labels' is present
      var labels = results[0].labels
      assert(labels)

			done()
		})
	})
})
